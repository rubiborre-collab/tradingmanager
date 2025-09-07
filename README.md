# Trading Manager - Aplicación Personal de Trading

Una aplicación completa para gestionar y analizar operaciones de trading con Next.js, PostgreSQL y análisis avanzado.

## 🚀 Deployment en Vercel

### Paso 1: Preparar el repositorio
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/trading-app.git
git push -u origin main
```

### Paso 2: Configurar base de datos
1. Crear cuenta en [Neon](https://neon.tech) (PostgreSQL gratuito)
2. Crear nueva base de datos
3. Copiar la `DATABASE_URL`

### Paso 3: Deploy en Vercel
1. Ir a [vercel.com](https://vercel.com)
2. Conectar con GitHub
3. Importar el repositorio
4. Configurar variables de entorno:
   - `DATABASE_URL`: Tu connection string de Neon
   - `TRADES_API_KEY`: Una clave segura (ej: `tk_live_abc123xyz789`)

### Paso 4: Crear tabla en la base de datos
La tabla se crea automáticamente al hacer la primera llamada a `/api/health`.

## 🔧 Variables de entorno necesarias

```env
DATABASE_URL=postgresql://username:password@host:port/database
TRADES_API_KEY=your-secure-api-key-here
NEXT_PUBLIC_APP_PASSWORD=trading123
```

## 📡 API Endpoints

### Crear operación
```bash
curl -X POST https://tu-app.vercel.app/api/trades \
  -H "Content-Type: application/json" \
  -H "x-api-key: tu-api-key" \
  -d '{
    "symbol": "AAPL",
    "side": "BUY",
    "quantity": 100,
    "price": 175.50,
    "commission": 1.0,
    "executed_at": "2024-01-15T10:30:00Z",
    "source": "interactive_brokers",
    "source_id": "IB_12345",
    "notes": "Breakout trade"
  }'
```

### Health check
```bash
curl https://tu-app.vercel.app/api/health
```

## 🎯 Características

- ✅ **Dashboard** con métricas en tiempo real
- ✅ **Blotter** para registrar operaciones
- ✅ **Análisis** de performance por símbolo
- ✅ **Calendario** de PnL diario
- ✅ **Cash flows** separados de rentabilidad
- ✅ **API REST** para automatización
- ✅ **Gráficos** interactivos con Recharts

## 🔐 Seguridad

- Autenticación por contraseña
- API key para endpoints
- Validación con Zod
- Sanitización de datos

## 📱 Responsive

Optimizado para desktop, tablet y móvil.