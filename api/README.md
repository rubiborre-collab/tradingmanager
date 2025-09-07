# Trading Manager API - FastAPI

API completa para gestión de operaciones de trading usando FastAPI.

## 🚀 Instalación en tu servidor

### Opción 1: Instalación directa

```bash
# 1. Subir archivos a tu servidor
scp -r api/ usuario@tu-servidor:/home/usuario/trading-api/

# 2. Conectar al servidor
ssh usuario@tu-servidor

# 3. Ir al directorio
cd /home/usuario/trading-api

# 4. Dar permisos de ejecución
chmod +x run.sh

# 5. Ejecutar
./run.sh
```

### Opción 2: Con Docker (Recomendado)

```bash
# 1. Subir archivos
scp -r api/ usuario@tu-servidor:/home/usuario/trading-api/

# 2. Conectar al servidor
ssh usuario@tu-servidor
cd /home/usuario/trading-api

# 3. Configurar variables de entorno
echo "API_KEY=tu-clave-super-secreta" > .env

# 4. Ejecutar con Docker
docker-compose up -d
```

## 🔧 Configuración

### Variables de entorno:
```bash
API_KEY=tu-clave-super-secreta  # Cambia esto por una clave segura
```

### Puertos:
- **8000**: API FastAPI
- **80/443**: Nginx (opcional)

## 📡 Endpoints disponibles

### Health Check
```bash
curl http://tu-servidor:8000/health
```

### Crear operación
```bash
curl -X POST http://tu-servidor:8000/trades \
  -H "Content-Type: application/json" \
  -H "x-api-key: tu-clave-super-secreta" \
  -d '{
    "symbol": "AAPL",
    "side": "BUY",
    "quantity": 100,
    "price": 175.50,
    "commission": 1.0,
    "executed_at": "2024-01-15T10:30:00",
    "source": "interactive_brokers",
    "source_id": "IB_12345",
    "notes": "Breakout trade"
  }'
```

### Obtener operaciones
```bash
curl -H "x-api-key: tu-clave-super-secreta" \
  http://tu-servidor:8000/trades
```

### Verificar si existe operación
```bash
curl -H "x-api-key: tu-clave-super-secreta" \
  "http://tu-servidor:8000/trades/check?source_id=IB_12345"
```

### Estadísticas
```bash
curl -H "x-api-key: tu-clave-super-secreta" \
  http://tu-servidor:8000/stats/summary
```

## 📚 Documentación interactiva

Una vez ejecutando, visita:
- **Swagger UI**: http://tu-servidor:8000/docs
- **ReDoc**: http://tu-servidor:8000/redoc

## 🔒 Seguridad

- ✅ Autenticación por API Key
- ✅ Validación de datos con Pydantic
- ✅ Rate limiting con Nginx
- ✅ CORS configurado
- ✅ Headers de seguridad

## 🗄️ Base de datos

Usa SQLite por defecto (archivo `trading.db`). Para producción, puedes cambiar a PostgreSQL modificando la conexión.

## 🔄 Integración con Next.js

Actualiza tu aplicación Next.js para usar tu API:

```javascript
// En tu .env.local
NEXT_PUBLIC_API_URL=http://tu-servidor:8000
NEXT_PUBLIC_API_KEY=tu-clave-super-secreta
```

## 📊 Monitoreo

### Logs
```bash
# Ver logs en tiempo real
docker-compose logs -f trading-api
```

### Métricas
La API incluye endpoints de health check para monitoreo.

## 🚀 Producción

Para producción, considera:

1. **HTTPS**: Configura SSL en Nginx
2. **Firewall**: Solo abrir puertos necesarios
3. **Backup**: Respaldar `trading.db` regularmente
4. **Monitoring**: Usar herramientas como Grafana
5. **PostgreSQL**: Para mejor performance

## 🆘 Troubleshooting

### Puerto ocupado
```bash
sudo lsof -i :8000
sudo kill -9 PID
```

### Permisos
```bash
sudo chown -R $USER:$USER /home/usuario/trading-api
chmod +x run.sh
```

### Logs de error
```bash
tail -f /var/log/syslog | grep trading
```