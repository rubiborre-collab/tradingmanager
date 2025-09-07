# Integración con n8n - Trading Manager

## 📡 Endpoints de API

### Base URL
```
https://trackeroperaciones.com/api
```

### Autenticación
Todas las llamadas requieren el header:
```
x-api-key: tu-api-key-aqui
```

---

## 🔄 Endpoints Disponibles

### 1. Health Check
```http
GET /api/health
```

**Respuesta:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "service": "Trading Manager API",
  "timezone": "Europe/Madrid"
}
```

### 2. Crear Operación
```http
POST /api/trades
Content-Type: application/json
x-api-key: tu-api-key-aqui
```

**Body (campos requeridos):**
```json
{
  "symbol": "AAPL",
  "side": "BUY",
  "quantity": 100,
  "price": 175.50
}
```

**Body (completo con campos opcionales):**
```json
{
  "symbol": "AAPL",
  "side": "BUY",
  "quantity": 100,
  "price": 175.50,
  "fee": 0.34,
  "executed_at": "2024-01-15T10:30:00.000Z",
  "notes": "Breakout alcista confirmado",
  "entry_reason": "Breakout alcista",
  "exit_reason": null,
  "external_id": "IB_12345678",
  "tags": ["momentum", "tech"]
}
```

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "message": "Trade created successfully",
  "data": {
    "id": "1642248600000",
    "symbol": "AAPL",
    "side": "BUY",
    "quantity": 100,
    "price": 175.50,
    "fee": 0.34,
    "executed_at": "2024-01-15T10:30:00.000Z",
    "status": "COMPLETO",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 🤖 Configuración en n8n

### Workflow Básico: Enviar Trade Manual

1. **Trigger Node**: Manual Trigger
2. **HTTP Request Node**: 
   - Method: `POST`
   - URL: `https://trackeroperaciones.com/api/trades`
   - Headers:
     ```json
     {
       "Content-Type": "application/json",
       "x-api-key": "tu-api-key-aqui"
     }
     ```
   - Body:
     ```json
     {
       "symbol": "{{ $json.symbol }}",
       "side": "{{ $json.side }}",
       "quantity": {{ $json.quantity }},
       "price": {{ $json.price }},
       "notes": "Enviado desde n8n"
     }
     ```

### Workflow Avanzado: Desde Interactive Brokers

1. **Webhook Node**: Recibe datos de IB
2. **Function Node**: Transforma datos
   ```javascript
   // Transformar datos de IB al formato esperado
   const ibData = items[0].json;
   
   return [{
     json: {
       symbol: ibData.contract.symbol,
       side: ibData.order.action, // "BUY" o "SELL"
       quantity: ibData.order.totalQuantity,
       price: ibData.execution.price,
       fee: ibData.execution.commission,
       executed_at: new Date(ibData.execution.time).toISOString(),
       external_id: `IB_${ibData.execution.execId}`,
       notes: `Ejecutado en IB - Order ID: ${ibData.order.orderId}`
     }
   }];
   ```
3. **HTTP Request Node**: Envía a Trading Manager

### Workflow con Validación

```javascript
// Function Node - Validación de datos
const trade = items[0].json;

// Validaciones
if (!trade.symbol || !trade.side || !trade.quantity || !trade.price) {
  throw new Error('Faltan campos requeridos');
}

if (trade.quantity <= 0 || trade.price <= 0) {
  throw new Error('Cantidad y precio deben ser positivos');
}

if (!['BUY', 'SELL'].includes(trade.side)) {
  throw new Error('Side debe ser BUY o SELL');
}

// Formatear datos
return [{
  json: {
    symbol: trade.symbol.toUpperCase(),
    side: trade.side,
    quantity: parseFloat(trade.quantity),
    price: parseFloat(trade.price),
    fee: trade.fee || 0.34,
    executed_at: trade.executed_at || new Date().toISOString(),
    notes: trade.notes,
    entry_reason: trade.entry_reason,
    exit_reason: trade.exit_reason,
    external_id: trade.external_id,
    tags: trade.tags || []
  }
}];
```

---

## 🔐 Configuración de API Key

1. Ve a **Configuración** en Trading Manager
2. Copia tu API Key
3. Úsala en el header `x-api-key` de todas las llamadas

---

## 📝 Ejemplos de Uso

### Compra de Acciones
```bash
curl -X POST https://trackeroperaciones.com/api/trades \
  -H "Content-Type: application/json" \
  -H "x-api-key: tu-api-key-aqui" \
  -d '{
    "symbol": "TSLA",
    "side": "BUY",
    "quantity": 50,
    "price": 245.80,
    "entry_reason": "Breakout alcista",
    "notes": "Entrada en soporte clave"
  }'
```

### Venta de Acciones
```bash
curl -X POST https://trackeroperaciones.com/api/trades \
  -H "Content-Type: application/json" \
  -H "x-api-key: tu-api-key-aqui" \
  -d '{
    "symbol": "TSLA",
    "side": "SELL",
    "quantity": 50,
    "price": 267.50,
    "exit_reason": "Take profit",
    "notes": "Objetivo alcanzado +8.8%"
  }'
```

---

## ⚠️ Notas Importantes

1. **API Key**: Mantén tu API key segura y no la compartas
2. **Rate Limiting**: No implementado aún, pero usa con moderación
3. **Validación**: La API valida todos los campos antes de procesar
4. **Timezone**: Todas las fechas se manejan en Europe/Madrid
5. **Idempotencia**: Usa `external_id` para evitar duplicados

---

## 🐛 Códigos de Error

- `400`: Datos inválidos o campos faltantes
- `401`: API key inválida o faltante
- `500`: Error interno del servidor

---

## 📞 Soporte

Si tienes problemas con la integración, verifica:
1. ✅ API key correcta
2. ✅ Headers incluidos
3. ✅ Formato JSON válido
4. ✅ Campos requeridos presentes
5. ✅ URL correcta