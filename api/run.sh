#!/bin/bash

# Script para ejecutar la API en tu servidor

echo "🚀 Iniciando Trading Manager API..."

# Crear directorio para datos si no existe
mkdir -p data

# Verificar si Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 no está instalado. Instalando..."
    sudo apt update
    sudo apt install -y python3 python3-pip python3-venv
fi

# Crear entorno virtual si no existe
if [ ! -d "venv" ]; then
    echo "📦 Creando entorno virtual..."
    python3 -m venv venv
fi

# Activar entorno virtual
source venv/bin/activate

# Instalar dependencias
echo "📥 Instalando dependencias..."
pip install -r requirements.txt

# Configurar variables de entorno
export API_KEY=${API_KEY:-"default-api-key-change-this"}

echo "✅ Configuración completada!"
echo "🔑 API Key: $API_KEY"
echo "🌐 La API estará disponible en: http://tu-servidor:8000"
echo "📚 Documentación en: http://tu-servidor:8000/docs"

# Ejecutar la API
echo "🚀 Iniciando servidor..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload