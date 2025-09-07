'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, RefreshCw, Copy, Settings as SettingsIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface Settings {
  id: string;
  starting_cash: number;
  default_fee: number;
  risk_pct: number;
  entry_reasons: string[];
  exit_reasons: string[];
  timezone: string;
  benchmark_source: string;
  api_key: string;
}

// Función para guardar configuración en localStorage
const saveSettingsToStorage = (settings: Settings) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('trading_settings', JSON.stringify(settings));
  }
};

// Función para obtener configuración del localStorage
const getStoredSettings = (): Settings => {
  if (typeof window === 'undefined') {
    return getDefaultSettings();
  }
  
  const stored = localStorage.getItem('trading_settings');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error parsing stored settings:', error);
    }
  }
  
  return getDefaultSettings();
};

// Función para obtener configuración por defecto
const getDefaultSettings = (): Settings => ({
  id: '1',
  starting_cash: 13300.00,
  default_fee: 0.34,
  risk_pct: 1.0,
  entry_reasons: [
    'Breakout alcista',
    'Rebote soporte',
    'Pullback tendencia',
    'Momentum trade',
    'Gap up',
    'Patrón bandera'
  ],
  exit_reasons: [
    'Take profit',
    'Stop loss',
    'Trailing stop',
    'Breakeven',
    'Gestión tiempo',
    'Cambio tendencia'
  ],
  timezone: 'Europe/Madrid',
  benchmark_source: 'S&P 500',
  api_key: 'tk_live_8f2d3c4e5a1b6789...'
});

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [newEntryReason, setNewEntryReason] = useState('');
  const [newExitReason, setNewExitReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Cargar configuración del localStorage
    const storedSettings = getStoredSettings();
    setSettings(storedSettings);
    
    // Si es la primera vez, guardar la configuración por defecto
    if (!localStorage.getItem('trading_settings')) {
      saveSettingsToStorage(storedSettings);
    }
    
    setIsLoading(false);
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    
    setIsSaving(true);
    try {
      // Guardar en localStorage
      saveSettingsToStorage(settings);
      
      // Disparar evento para notificar cambios a otros componentes
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));
      
      toast.success('Configuración guardada correctamente');
    } catch (error) {
      toast.error('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const addEntryReason = () => {
    if (!newEntryReason.trim() || !settings) return;
    
    if (settings.entry_reasons.includes(newEntryReason)) {
      toast.error('Este motivo ya existe');
      return;
    }
    
    const updatedSettings = {
      ...settings,
      entry_reasons: [...settings.entry_reasons, newEntryReason.trim()]
    };
    
    setSettings(updatedSettings);
    saveSettingsToStorage(updatedSettings);
    setNewEntryReason('');
    
    // Disparar evento para actualizar otros componentes
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: updatedSettings }));
    toast.success('Motivo de entrada añadido');
  };

  const removeEntryReason = (reason: string) => {
    if (!settings) return;
    
    const updatedSettings = {
      ...settings,
      entry_reasons: settings.entry_reasons.filter(r => r !== reason)
    };
    
    setSettings(updatedSettings);
    saveSettingsToStorage(updatedSettings);
    
    // Disparar evento para actualizar otros componentes
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: updatedSettings }));
    toast.success('Motivo de entrada eliminado');
  };

  const addExitReason = () => {
    if (!newExitReason.trim() || !settings) return;
    
    if (settings.exit_reasons.includes(newExitReason)) {
      toast.error('Este motivo ya existe');
      return;
    }
    
    const updatedSettings = {
      ...settings,
      exit_reasons: [...settings.exit_reasons, newExitReason.trim()]
    };
    
    setSettings(updatedSettings);
    saveSettingsToStorage(updatedSettings);
    setNewExitReason('');
    
    // Disparar evento para actualizar otros componentes
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: updatedSettings }));
    toast.success('Motivo de salida añadido');
  };

  const removeExitReason = (reason: string) => {
    if (!settings) return;
    
    const updatedSettings = {
      ...settings,
      exit_reasons: settings.exit_reasons.filter(r => r !== reason)
    };
    
    setSettings(updatedSettings);
    saveSettingsToStorage(updatedSettings);
    
    // Disparar evento para actualizar otros componentes
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: updatedSettings }));
    toast.success('Motivo de salida eliminado');
  };

  const copyApiKey = () => {
    if (settings?.api_key) {
      navigator.clipboard.writeText(settings.api_key);
      toast.success('API Key copiada al portapapeles');
    }
  };

  const regenerateApiKey = async () => {
    try {
      // Generate new API key - in real app this would be an API call
      const newApiKey = `tk_live_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
      
      if (settings) {
        const updatedSettings = { ...settings, api_key: newApiKey };
        setSettings(updatedSettings);
        saveSettingsToStorage(updatedSettings);
        toast.success('Nueva API Key generada');
      }
    } catch (error) {
      toast.error('Error al generar nueva API Key');
    }
  };

  if (isLoading) {
    return <div className="p-6">Cargando configuración...</div>;
  }

  if (!settings) {
    return <div className="p-6">Error al cargar la configuración</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 mt-2">
          Gestiona la configuración de tu aplicación de trading
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Configuración General
          </CardTitle>
          <CardDescription>
            Configuración básica de la aplicación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="starting_cash">Capital Inicial (€)</Label>
              <Input
                id="starting_cash"
                type="number"
                step="0.01"
                value={settings.starting_cash}
                onChange={(e) => setSettings({
                  ...settings,
                  starting_cash: parseFloat(e.target.value) || 0
                })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Capital base para calcular el equity
              </p>
            </div>
            <div>
              <Label htmlFor="default_fee">Comisión por Defecto (€)</Label>
              <Input
                id="default_fee"
                type="number"
                step="0.01"
                value={settings.default_fee}
                onChange={(e) => setSettings({
                  ...settings,
                  default_fee: parseFloat(e.target.value) || 0
                })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Comisión aplicada automáticamente
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="risk_pct">Riesgo por Operación (%)</Label>
              <Input
                id="risk_pct"
                type="number"
                step="0.1"
                value={settings.risk_pct}
                onChange={(e) => setSettings({
                  ...settings,
                  risk_pct: parseFloat(e.target.value) || 0
                })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Porcentaje de equity arriesgado por operación
              </p>
            </div>
            <div>
              <Label htmlFor="benchmark_source">Fuente de Benchmark</Label>
              <Input
                id="benchmark_source"
                value={settings.benchmark_source}
                onChange={(e) => setSettings({
                  ...settings,
                  benchmark_source: e.target.value
                })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Referencia para comparar performance
              </p>
            </div>
          </div>

          <div>
            <Label>Zona Horaria</Label>
            <div className="mt-1 p-3 bg-gray-50 border rounded-md">
              <span className="font-mono text-sm">{settings.timezone}</span>
              <p className="text-xs text-gray-500 mt-1">
                Zona horaria fija para todas las operaciones
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entry Reasons */}
      <Card>
        <CardHeader>
          <CardTitle>Motivos de Entrada</CardTitle>
          <CardDescription>
            Configurar los motivos predefinidos para operaciones de compra
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nuevo motivo de entrada..."
                value={newEntryReason}
                onChange={(e) => setNewEntryReason(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addEntryReason()}
              />
              <Button onClick={addEntryReason}>Añadir</Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {settings.entry_reasons.map((reason) => (
                <Badge 
                  key={reason} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-red-100 hover:text-red-700"
                  onClick={() => removeEntryReason(reason)}
                >
                  {reason} ×
                </Badge>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Click en un motivo para eliminarlo
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Exit Reasons */}
      <Card>
        <CardHeader>
          <CardTitle>Motivos de Salida</CardTitle>
          <CardDescription>
            Configurar los motivos predefinidos para operaciones de venta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nuevo motivo de salida..."
                value={newExitReason}
                onChange={(e) => setNewExitReason(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addExitReason()}
              />
              <Button onClick={addExitReason}>Añadir</Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {settings.exit_reasons.map((reason) => (
                <Badge 
                  key={reason} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-red-100 hover:text-red-700"
                  onClick={() => removeExitReason(reason)}
                >
                  {reason} ×
                </Badge>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Click en un motivo para eliminarlo
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de API</CardTitle>
          <CardDescription>
            Gestiona tu clave de API para automatización externa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="api_key">API Key</Label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <Input
                    id="api_key"
                    type={showApiKey ? "text" : "password"}
                    value={settings.api_key}
                    readOnly
                    className="font-mono pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button variant="outline" onClick={copyApiKey}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={regenerateApiKey}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Usa esta clave en el header x-api-key para acceder a la API
              </p>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Seguridad</h4>
              <p className="text-sm text-yellow-700">
                Tu API key da acceso completo a tu cuenta. No la compartas y genera una nueva 
                si crees que puede estar comprometida.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="px-8"
        >
          {isSaving ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </div>
  );
}