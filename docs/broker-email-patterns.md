# Patrones de Email por Broker

## 🏦 Interactive Brokers

### Formato típico de email de ejecución:
```
Subject: Trade Confirmation - AAPL
From: noreply@interactivebrokers.com

Your order has been executed:

Symbol: AAPL
Side: BUY
Quantity: 100
Price: 175.50
Commission: 1.00
Executed: 2024-05-15 10:30:00 EST
Order ID: 12345678
```

### Regex patterns para IB:
```javascript
const ibPatterns = {
  ticker: /Symbol:\s*([A-Z]+)/i,
  side: /Side:\s*(BUY|SELL)/i,
  quantity: /Quantity:\s*([0-9,]+)/i,
  price: /Price:\s*([0-9.]+)/i,
  commission: /Commission:\s*([0-9.]+)/i,
  orderId: /Order ID:\s*([0-9]+)/i,
  executed: /Executed:\s*([0-9-]+\s[0-9:]+)/i
};
```

---

## 🇪🇸 DeGiro

### Formato típico de email:
```
Subject: Confirmación de orden - AAPL
From: noreply@degiro.es

Su orden ha sido ejecutada:

Instrumento: AAPL - Apple Inc
Operación: Compra
Cantidad: 100 acciones
Precio: 175,50 €
Comisión: 0,50 €
Fecha: 15/05/2024 16:30
```

### Regex patterns para DeGiro:
```javascript
const degiroPatterns = {
  ticker: /Instrumento:\s*([A-Z]+)/i,
  side: /Operación:\s*(Compra|Venta)/i,
  quantity: /Cantidad:\s*([0-9,]+)\s*acciones/i,
  price: /Precio:\s*([0-9,]+)\s*€/i,
  commission: /Comisión:\s*([0-9,]+)\s*€/i,
  date: /Fecha:\s*([0-9\/]+\s[0-9:]+)/i
};
```

---

## 🇺🇸 TD Ameritrade

### Formato típico:
```
Subject: Order Filled - AAPL
From: noreply@tdameritrade.com

Order Details:
Symbol: AAPL
Action: BUY
Quantity: 100
Fill Price: $175.50
Commission: $0.00
Fill Time: 05/15/2024 10:30:00 AM ET
```

### Regex patterns para TD:
```javascript
const tdPatterns = {
  ticker: /Symbol:\s*([A-Z]+)/i,
  side: /Action:\s*(BUY|SELL)/i,
  quantity: /Quantity:\s*([0-9,]+)/i,
  price: /Fill Price:\s*\$([0-9.]+)/i,
  commission: /Commission:\s*\$([0-9.]+)/i,
  time: /Fill Time:\s*([0-9\/]+\s[0-9:]+\s[AP]M)/i
};
```

---

## 🇬🇧 Trading 212

### Formato típico:
```
Subject: Order executed - AAPL
From: noreply@trading212.com

Your order has been executed:

Instrument: AAPL
Direction: Buy
Quantity: 100
Price: £142.30
Total: £14,230.00
Timestamp: 15/05/2024 15:30:00 GMT
```

### Regex patterns para Trading 212:
```javascript
const t212Patterns = {
  ticker: /Instrument:\s*([A-Z]+)/i,
  side: /Direction:\s*(Buy|Sell)/i,
  quantity: /Quantity:\s*([0-9,]+)/i,
  price: /Price:\s*£([0-9.]+)/i,
  total: /Total:\s*£([0-9,.]+)/i,
  timestamp: /Timestamp:\s*([0-9\/]+\s[0-9:]+)/i
};
```

---

## 🔧 **Función Universal de Extracción**

```javascript
// Node: Function - Extractor universal
function extractTradeFromEmail(emailBody, subject, sender) {
  const body = emailBody.toLowerCase();
  const subj = subject.toLowerCase();
  
  // Detectar broker
  let broker = 'unknown';
  if (sender.includes('interactivebrokers')) broker = 'ib';
  else if (sender.includes('degiro')) broker = 'degiro';
  else if (sender.includes('tdameritrade')) broker = 'td';
  else if (sender.includes('trading212')) broker = 't212';
  
  // Patrones por broker
  const patterns = {
    ib: {
      ticker: /symbol:\s*([a-z]+)/i,
      side: /side:\s*(buy|sell)/i,
      quantity: /quantity:\s*([0-9,]+)/i,
      price: /price:\s*([0-9.]+)/i,
      commission: /commission:\s*([0-9.]+)/i
    },
    degiro: {
      ticker: /instrumento:\s*([a-z]+)/i,
      side: /operación:\s*(compra|venta)/i,
      quantity: /cantidad:\s*([0-9,]+)/i,
      price: /precio:\s*([0-9,]+)/i,
      commission: /comisión:\s*([0-9,]+)/i
    },
    td: {
      ticker: /symbol:\s*([a-z]+)/i,
      side: /action:\s*(buy|sell)/i,
      quantity: /quantity:\s*([0-9,]+)/i,
      price: /fill price:\s*\$([0-9.]+)/i,
      commission: /commission:\s*\$([0-9.]+)/i
    },
    t212: {
      ticker: /instrument:\s*([a-z]+)/i,
      side: /direction:\s*(buy|sell)/i,
      quantity: /quantity:\s*([0-9,]+)/i,
      price: /price:\s*£([0-9.]+)/i
    }
  };
  
  const pattern = patterns[broker];
  if (!pattern) {
    throw new Error(`Broker no soportado: ${broker}`);
  }
  
  // Extraer datos
  const ticker = body.match(pattern.ticker)?.[1]?.toUpperCase();
  const sideRaw = body.match(pattern.side)?.[1];
  const quantity = body.match(pattern.quantity)?.[1]?.replace(',', '');
  const price = body.match(pattern.price)?.[1]?.replace(',', '.');
  const commission = body.match(pattern.commission)?.[1]?.replace(',', '.') || '0.34';
  
  // Normalizar side
  let side = 'COMPRA';
  if (sideRaw) {
    const s = sideRaw.toLowerCase();
    if (s.includes('sell') || s.includes('venta')) {
      side = 'VENTA';
    }
  }
  
  // Validar datos extraídos
  if (!ticker || !quantity || !price) {
    throw new Error('Datos incompletos extraídos del email');
  }
  
  return {
    ticker,
    tipo: side,
    cantidad: parseFloat(quantity),
    precio: parseFloat(price),
    fees: parseFloat(commission),
    broker,
    external_id: `${broker.toUpperCase()}_${Date.now()}`,
    fecha_ejecucion: new Date().toISOString(),
    notas: `Procesado automáticamente desde ${broker.toUpperCase()}`,
    email_subject: subject,
    email_sender: sender
  };
}

// Usar la función
const emailData = $input.first().json;
const tradeData = extractTradeFromEmail(
  emailData.body || emailData.textPlain,
  emailData.subject,
  emailData.from.address
);

return [{ json: tradeData }];
```

---

## 🧪 **Testing con Emails Reales**

### Ejemplo de test con email de IB:
```javascript
// Node: Function - Test con email real
const testEmail = {
  subject: "Trade Confirmation - AAPL",
  body: `
    Your order has been executed:
    Symbol: AAPL
    Side: BUY
    Quantity: 100
    Price: 175.50
    Commission: 1.00
    Executed: 2024-05-15 10:30:00 EST
  `,
  from: { address: "noreply@interactivebrokers.com" }
};

const extracted = extractTradeFromEmail(
  testEmail.body,
  testEmail.subject,
  testEmail.from.address
);

console.log('✅ Datos extraídos:', extracted);

// Debería devolver:
// {
//   ticker: "AAPL",
//   tipo: "COMPRA",
//   cantidad: 100,
//   precio: 175.50,
//   fees: 1.00,
//   broker: "ib",
//   external_id: "IB_1642248600000"
// }
```

---

## 📋 **Checklist de Implementación**

### ✅ Configuración inicial:
- [ ] API Key copiada desde configuración
- [ ] Variables de entorno configuradas en n8n
- [ ] Gmail conectado en n8n
- [ ] Filtros de email configurados

### ✅ Desarrollo del workflow:
- [ ] Trigger de Gmail funcionando
- [ ] Extracción de datos probada
- [ ] Validación implementada
- [ ] HTTP Request a Trading App configurado
- [ ] Manejo de errores añadido

### ✅ Testing:
- [ ] Test manual con curl exitoso
- [ ] Test con email real de tu broker
- [ ] Verificación de duplicados funcionando
- [ ] Notificaciones configuradas

### ✅ Producción:
- [ ] Workflow activado en n8n
- [ ] Monitoreo de logs configurado
- [ ] Alertas de fallos configuradas
- [ ] Backup de configuración realizado

¿Con qué broker operas principalmente? Te puedo ayudar a ajustar los patrones específicos para tu caso.