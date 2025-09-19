# Integración Completa: Gmail → n8n → Trading App

## 🔄 Flujo Completo del Sistema

```
📧 Gmail (Broker) → 🤖 n8n (Procesamiento) → 📊 Trading App (Almacenamiento)
```

---

## 📧 **PASO 1: Configurar Gmail en n8n**

### 1.1 Crear Trigger de Gmail
```javascript
// Node: Gmail Trigger
{
  "name": "Gmail - Nuevos emails de trading",
  "type": "n8n-nodes-base.gmail",
  "parameters": {
    "operation": "getAll",
    "filters": {
      "q": "from:noreply@interactivebrokers.com OR from:notifications@degiro.es subject:(executed OR filled OR confirmación)"
    },
    "format": "full"
  }
}
```

### 1.2 Filtrar solo emails relevantes
```javascript
// Node: IF - Filtrar emails de trading
{
  "name": "¿Es email de trading?",
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": {
      "string": [
        {
          "value1": "={{ $json.subject }}",
          "operation": "contains",
          "value2": "executed"
        }
      ]
    }
  }
}
```

---

## 🧠 **PASO 2: Procesar Email con IA/Regex**

### 2.1 Extraer datos del email
```javascript
// Node: Function - Extraer datos de trading
const emailBody = $input.first().json.body;
const subject = $input.first().json.subject;

// Regex patterns para diferentes brokers
const patterns = {
  // Interactive Brokers
  ib: {
    ticker: /Symbol:\s*([A-Z]+)/i,
    side: /(BUY|SELL|Bought|Sold)/i,
    quantity: /Quantity:\s*([0-9,]+)/i,
    price: /Price:\s*([0-9.]+)/i,
    commission: /Commission:\s*([0-9.]+)/i
  },
  
  // DeGiro
  degiro: {
    ticker: /([A-Z]{3,5})\s*-/i,
    side: /(Compra|Venta|Buy|Sell)/i,
    quantity: /([0-9,]+)\s*(acciones|shares)/i,
    price: /precio\s*([0-9.]+)|price\s*([0-9.]+)/i
  }
};

// Función para extraer datos
function extractTradeData(body, subject) {
  let ticker, side, quantity, price, commission;
  
  // Detectar broker
  const isIB = body.includes('Interactive Brokers') || subject.includes('IBKR');
  const isDegiro = body.includes('DEGIRO') || subject.includes('degiro');
  
  if (isIB) {
    ticker = body.match(patterns.ib.ticker)?.[1];
    side = body.match(patterns.ib.side)?.[1];
    quantity = body.match(patterns.ib.quantity)?.[1]?.replace(',', '');
    price = body.match(patterns.ib.price)?.[1];
    commission = body.match(patterns.ib.commission)?.[1] || '0.34';
  } else if (isDegiro) {
    ticker = body.match(patterns.degiro.ticker)?.[1];
    side = body.match(patterns.degiro.side)?.[1];
    quantity = body.match(patterns.degiro.quantity)?.[1]?.replace(',', '');
    price = body.match(patterns.degiro.price)?.[1] || body.match(patterns.degiro.price)?.[2];
  }
  
  // Normalizar side
  if (side) {
    side = side.toLowerCase();
    if (side.includes('buy') || side.includes('compra') || side.includes('bought')) {
      side = 'COMPRA';
    } else if (side.includes('sell') || side.includes('venta') || side.includes('sold')) {
      side = 'VENTA';
    }
  }
  
  return {
    ticker: ticker?.toUpperCase(),
    tipo: side,
    cantidad: quantity ? parseFloat(quantity) : null,
    precio: price ? parseFloat(price) : null,
    fees: commission ? parseFloat(commission) : 0.34,
    external_id: `EMAIL_${Date.now()}`,
    fecha_ejecucion: new Date().toISOString(),
    notas: `Procesado automáticamente desde ${isIB ? 'Interactive Brokers' : isDegiro ? 'DeGiro' : 'email'}`
  };
}

// Extraer datos
const tradeData = extractTradeData(emailBody, subject);

// Validar que tenemos datos mínimos
if (!tradeData.ticker || !tradeData.tipo || !tradeData.cantidad || !tradeData.precio) {
  throw new Error('No se pudieron extraer todos los datos necesarios del email');
}

return [{ json: tradeData }];
```

### 2.2 Validación y enriquecimiento
```javascript
// Node: Function - Validar y enriquecer datos
const trade = $input.first().json;

// Validaciones
if (!trade.ticker || trade.ticker.length < 1) {
  throw new Error('Ticker inválido');
}

if (!['COMPRA', 'VENTA'].includes(trade.tipo)) {
  throw new Error('Tipo de operación inválido');
}

if (trade.cantidad <= 0 || trade.precio <= 0) {
  throw new Error('Cantidad y precio deben ser positivos');
}

// Enriquecer con datos adicionales
const enrichedTrade = {
  ...trade,
  // Calcular valor total
  valor_total: trade.cantidad * trade.precio,
  
  // Añadir timestamp
  timestamp: new Date().toISOString(),
  
  // Determinar motivo automático basado en patrones
  motivo_entrada: trade.tipo === 'COMPRA' ? 'Automatizado desde email' : undefined,
  motivo_salida: trade.tipo === 'VENTA' ? 'Automatizado desde email' : undefined,
  
  // Tags automáticos
  tags: ['automatico', 'email', trade.ticker.toLowerCase()]
};

return [{ json: enrichedTrade }];
```

---

## 📡 **PASO 3: Enviar a Trading App**

### 3.1 HTTP Request a tu API
```javascript
// Node: HTTP Request - Crear operación
{
  "name": "Crear operación en Trading App",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "https://trackeroperaciones.com/api/new-trade",
    "authentication": "none",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        },
        {
          "name": "x-api-key",
          "value": "{{ $vars.TRADING_API_KEY }}"
        }
      ]
    },
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "ticker",
          "value": "={{ $json.ticker }}"
        },
        {
          "name": "tipo",
          "value": "={{ $json.tipo }}"
        },
        {
          "name": "cantidad",
          "value": "={{ $json.cantidad }}"
        },
        {
          "name": "precio",
          "value": "={{ $json.precio }}"
        },
        {
          "name": "fees",
          "value": "={{ $json.fees }}"
        },
        {
          "name": "external_id",
          "value": "={{ $json.external_id }}"
        },
        {
          "name": "notas",
          "value": "={{ $json.notas }}"
        },
        {
          "name": "motivo_entrada",
          "value": "={{ $json.motivo_entrada }}"
        },
        {
          "name": "motivo_salida",
          "value": "={{ $json.motivo_salida }}"
        }
      ]
    }
  }
}
```

### 3.2 Manejo de respuesta y errores
```javascript
// Node: Function - Procesar respuesta
const response = $input.first().json;

if (response.success) {
  console.log('✅ Operación creada:', response.data.id);
  
  // Opcional: Enviar notificación de éxito
  return [{
    json: {
      status: 'success',
      message: `Operación ${response.data.ticker} ${response.data.tipo} creada correctamente`,
      trade_id: response.data.id,
      amount: response.data.valor_total
    }
  }];
} else {
  console.error('❌ Error:', response.error);
  throw new Error(`Error al crear operación: ${response.error}`);
}
```

---

## 📊 **PASO 4: Análisis desde Python**

### 4.1 Script Python para obtener datos
```python
import requests
import pandas as pd
from datetime import datetime, timedelta

class TradingAnalyzer:
    def __init__(self, api_url, api_key):
        self.api_url = api_url
        self.headers = {'x-api-key': api_key}
    
    def get_all_trades(self, **filters):
        """Obtener todas las operaciones con filtros opcionales"""
        response = requests.get(
            f"{self.api_url}/api/get-trades",
            headers=self.headers,
            params=filters
        )
        
        if response.status_code == 200:
            data = response.json()
            return pd.DataFrame(data['data']['trades'])
        else:
            raise Exception(f"Error API: {response.status_code}")
    
    def get_monthly_performance(self, year, month):
        """Análisis mensual"""
        from_date = f"{year}-{month:02d}-01"
        to_date = f"{year}-{month:02d}-31"
        
        return self.get_all_trades(
            fecha_desde=from_date,
            fecha_hasta=to_date
        )
    
    def analyze_symbol(self, ticker):
        """Análisis por símbolo"""
        df = self.get_all_trades(ticker=ticker)
        
        if df.empty:
            return None
        
        return {
            'total_trades': len(df),
            'winrate': len(df[df['resultado_r'] > 0]) / len(df) * 100,
            'avg_r': df['resultado_r'].mean(),
            'total_pnl': df['pnl_euros'].sum(),
            'best_trade': df['pnl_euros'].max(),
            'worst_trade': df['pnl_euros'].min()
        }

# Uso
analyzer = TradingAnalyzer(
    api_url="https://trackeroperaciones.com",
    api_key="tu-api-key-aqui"
)

# Obtener operaciones del último mes
trades_df = analyzer.get_monthly_performance(2024, 5)
print(f"Operaciones de mayo: {len(trades_df)}")

# Análisis por símbolo
aapl_stats = analyzer.analyze_symbol('AAPL')
print(f"AAPL Winrate: {aapl_stats['winrate']:.1f}%")
```

---

## 🔧 **PASO 5: Configuración en n8n**

### 5.1 Variables de entorno en n8n
```javascript
// En n8n Settings → Variables
TRADING_API_KEY = "tu-api-key-desde-configuracion"
TRADING_API_URL = "https://trackeroperaciones.com"
GMAIL_FILTER = "from:noreply@interactivebrokers.com subject:executed"
```

### 5.2 Workflow completo en n8n
```json
{
  "name": "Trading Automation - Gmail to App",
  "nodes": [
    {
      "name": "Gmail Trigger",
      "type": "@n8n/n8n-nodes-langchain.gmail",
      "parameters": {
        "pollTimes": {
          "item": [
            {
              "mode": "everyMinute",
              "minute": 5
            }
          ]
        },
        "filters": {
          "q": "{{ $vars.GMAIL_FILTER }}"
        }
      }
    },
    {
      "name": "Extract Trade Data",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Código de extracción aquí"
      }
    },
    {
      "name": "Send to Trading App",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "{{ $vars.TRADING_API_URL }}/api/new-trade",
        "headers": {
          "x-api-key": "{{ $vars.TRADING_API_KEY }}"
        }
      }
    },
    {
      "name": "Success Notification",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "message": "✅ Nueva operación: {{ $json.ticker }} {{ $json.tipo }} - {{ $json.valor_total }}€"
      }
    }
  ]
}
```

---

## 🧪 **PASO 6: Testing y Debugging**

### 6.1 Test manual con curl
```bash
# Test crear operación
curl -X POST https://trackeroperaciones.com/api/new-trade \
  -H "Content-Type: application/json" \
  -H "x-api-key: tu-api-key-aqui" \
  -d '{
    "ticker": "AAPL",
    "tipo": "COMPRA",
    "cantidad": 100,
    "precio": 175.50,
    "stop_loss": 165.00,
    "motivo_entrada": "Test desde n8n",
    "external_id": "TEST_001",
    "notas": "Operación de prueba"
  }'

# Test obtener operaciones
curl -H "x-api-key: tu-api-key-aqui" \
  "https://trackeroperaciones.com/api/get-trades?limit=10"

# Test estado del sistema
curl -H "x-api-key: tu-api-key-aqui" \
  "https://trackeroperaciones.com/api/trades-status"
```

### 6.2 Validar en n8n
```javascript
// Node: Function - Debug y validación
const response = $input.first().json;

console.log('📊 Respuesta de Trading App:', {
  success: response.success,
  trade_id: response.data?.id,
  ticker: response.data?.ticker,
  error: response.error
});

// Si hay error, enviar alerta
if (!response.success) {
  return [{
    json: {
      alert: true,
      message: `Error creando operación: ${response.error}`,
      original_data: $input.first().json
    }
  }];
}

return [{ json: response }];
```

---

## 📱 **PASO 7: Notificaciones y Monitoreo**

### 7.1 Slack/Discord notification
```javascript
// Node: Slack - Notificación de éxito
{
  "name": "Notificar operación creada",
  "type": "n8n-nodes-base.slack",
  "parameters": {
    "channel": "#trading",
    "text": "🎯 Nueva operación automática",
    "attachments": [
      {
        "color": "good",
        "fields": [
          {
            "title": "Símbolo",
            "value": "{{ $json.ticker }}",
            "short": true
          },
          {
            "title": "Operación",
            "value": "{{ $json.tipo }}",
            "short": true
          },
          {
            "title": "Cantidad",
            "value": "{{ $json.cantidad }}",
            "short": true
          },
          {
            "title": "Precio",
            "value": "€{{ $json.precio }}",
            "short": true
          },
          {
            "title": "Valor Total",
            "value": "€{{ $json.valor_total }}",
            "short": false
          }
        ]
      }
    ]
  }
}
```

### 7.2 Email de confirmación
```javascript
// Node: Send Email - Confirmación
{
  "name": "Email confirmación",
  "type": "n8n-nodes-base.emailSend",
  "parameters": {
    "to": "tu-email@gmail.com",
    "subject": "✅ Operación registrada: {{ $json.ticker }}",
    "text": `
Operación registrada automáticamente:

📊 Símbolo: {{ $json.ticker }}
🔄 Tipo: {{ $json.tipo }}
📈 Cantidad: {{ $json.cantidad }}
💰 Precio: €{{ $json.precio }}
💸 Valor total: €{{ $json.valor_total }}
🆔 ID: {{ $json.id }}

Ver en app: https://trackeroperaciones.com/dashboard/blotter
    `
  }
}
```

---

## ⚙️ **PASO 8: Configuración Avanzada**

### 8.1 Manejo de duplicados
```javascript
// Node: Function - Verificar duplicados
const trade = $input.first().json;

// Verificar si ya existe
const checkResponse = await fetch(
  `https://trackeroperaciones.com/api/get-trades?external_id=${trade.external_id}`,
  {
    headers: {
      'x-api-key': 'tu-api-key-aqui'
    }
  }
);

const existingTrades = await checkResponse.json();

if (existingTrades.data.trades.length > 0) {
  console.log('⚠️ Operación ya existe, saltando...');
  return []; // No continuar el workflow
}

return [{ json: trade }];
```

### 8.2 Retry logic para fallos
```javascript
// Node: Function - Retry con backoff
let attempt = 0;
const maxAttempts = 3;
const trade = $input.first().json;

while (attempt < maxAttempts) {
  try {
    const response = await fetch('https://trackeroperaciones.com/api/new-trade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'tu-api-key-aqui'
      },
      body: JSON.stringify(trade)
    });
    
    if (response.ok) {
      const result = await response.json();
      return [{ json: result }];
    }
    
    throw new Error(`HTTP ${response.status}`);
    
  } catch (error) {
    attempt++;
    console.log(`❌ Intento ${attempt} falló:`, error.message);
    
    if (attempt >= maxAttempts) {
      throw new Error(`Falló después de ${maxAttempts} intentos: ${error.message}`);
    }
    
    // Esperar antes del siguiente intento
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
}
```

---

## 🔐 **PASO 9: Seguridad y Configuración**

### 9.1 Obtener tu API Key
1. Ve a **https://trackeroperaciones.com/dashboard/settings**
2. Copia tu **API Key** desde la sección "Configuración de API"
3. Úsala en n8n como variable de entorno

### 9.2 Configurar webhook (alternativo)
```javascript
// Si prefieres webhook en lugar de polling Gmail
{
  "name": "Webhook - Recibir desde Gmail",
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "trading-webhook",
    "httpMethod": "POST",
    "responseMode": "responseNode"
  }
}
```

---

## 📈 **PASO 10: Monitoreo y Analytics**

### 10.1 Dashboard de n8n
```javascript
// Node: Function - Estadísticas del workflow
const stats = {
  total_processed: $input.all().length,
  successful: $input.all().filter(item => item.json.success).length,
  failed: $input.all().filter(item => !item.json.success).length,
  timestamp: new Date().toISOString()
};

// Guardar estadísticas en base de datos o enviar a analytics
console.log('📊 Estadísticas del workflow:', stats);

return [{ json: stats }];
```

### 10.2 Alertas de fallos
```javascript
// Node: IF - Detectar fallos
{
  "name": "¿Hubo errores?",
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": {
      "boolean": [
        {
          "value1": "={{ $json.success }}",
          "value2": false
        }
      ]
    }
  }
}

// Node: Slack - Alerta de error
{
  "name": "Alerta de error",
  "type": "n8n-nodes-base.slack",
  "parameters": {
    "channel": "#trading-alerts",
    "text": "🚨 Error procesando operación",
    "attachments": [
      {
        "color": "danger",
        "text": "{{ $json.error }}\n\nDatos originales: {{ JSON.stringify($json.original_data) }}"
      }
    ]
  }
}
```

---

## 🎯 **Resultado Final**

Con esta configuración tendrás:

✅ **Automatización completa**: Gmail → n8n → Trading App  
✅ **Validación robusta** de datos  
✅ **Prevención de duplicados**  
✅ **Manejo de errores** y reintentos  
✅ **Notificaciones** de éxito/fallo  
✅ **API para análisis** desde Python/Excel  
✅ **Monitoreo** y debugging  

## 🚀 **Próximos pasos:**

1. **Configura Gmail** en n8n con los filtros
2. **Copia tu API Key** desde configuración
3. **Crea el workflow** con los nodos explicados
4. **Prueba con un email** de trading real
5. **Ajusta los regex** según tu broker específico

¿Quieres que te ayude con algún paso específico o tienes algún broker en particular que necesites configurar?