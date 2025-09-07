'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface ExecutionFormData {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: string;
  price: string;
  fee: string;
  executed_at: string;
  notes: string;
  entry_reason: string;
  exit_reason: string;
  stop_price: string;
  tags: string[];
}

interface RiskCalculation {
  suggested_position_size: number;
  risk_per_share: number;
  risk_amount: number;
  target_3r: number;
  risk_percent: number;
  account_risk_percent: number;
}

interface ExecutionFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<ExecutionFormData>;
}

// Función para obtener configuración del localStorage
const getStoredSettings = () => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('trading_settings');
  return stored ? JSON.parse(stored) : null;
};

export function ExecutionForm({ onSubmit, onCancel, initialData }: ExecutionFormProps) {
  const [formData, setFormData] = useState<ExecutionFormData>({
    symbol: '',
    side: 'BUY',
    quantity: '',
    price: '',
    fee: '0.34',
    executed_at: new Date().toISOString().slice(0, 16),
    notes: '',
    entry_reason: '',
    exit_reason: '',
    stop_price: '',
    tags: [],
    ...initialData
  });

  const [riskCalc, setRiskCalc] = useState<RiskCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [currentEquity, setCurrentEquity] = useState<number>(13300);
  const [availableReasons, setAvailableReasons] = useState({
    entry: [] as string[],
    exit: [] as string[]
  });

  useEffect(() => {
    // Calcular equity actual dinámicamente
    const calculateCurrentEquity = () => {
      const initialCapital = 13300;
      
      const getCashFlows = () => {
        if (typeof window === 'undefined') return [];
        const stored = localStorage.getItem('trading_cash_flows');
        return stored ? JSON.parse(stored) : [];
      };
      
      const cashFlows = getCashFlows();
      const netCashFlows = cashFlows
        .filter((cf: any) => !(cf.amount === 13300 && cf.type === 'DEPOSIT' && cf.note === 'Depósito inicial'))
        .reduce((sum: number, cf: any) => sum + (cf.type === 'DEPOSIT' ? cf.amount : -cf.amount), 0);
      
      return initialCapital + netCashFlows;
    };
    
    setCurrentEquity(calculateCurrentEquity());
    
    // Cargar motivos desde configuración
    const loadReasonsFromSettings = () => {
      const settings = getStoredSettings();
      if (settings) {
        setAvailableReasons({
          entry: settings.entry_reasons || [],
          exit: settings.exit_reasons || []
        });
      } else {
        // Motivos por defecto si no hay configuración
        setAvailableReasons({
          entry: [
            'Breakout alcista',
            'Rebote soporte',
            'Pullback tendencia',
            'Momentum trade',
            'Gap up',
            'Patrón bandera'
          ],
          exit: [
            'Take profit',
            'Stop loss',
            'Trailing stop',
            'Breakeven',
            'Gestión tiempo',
            'Cambio tendencia'
          ]
        });
      }
    };
    
    loadReasonsFromSettings();
    
    // Escuchar cambios en la configuración
    const handleSettingsUpdate = (event: any) => {
      const updatedSettings = event.detail;
      setAvailableReasons({
        entry: updatedSettings.entry_reasons || [],
        exit: updatedSettings.exit_reasons || []
      });
    };
    
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
  }, []);

  const calculateRisk = async () => {
    if (!formData.symbol || !formData.price || !formData.stop_price) {
      toast.error('Completa símbolo, precio de entrada y stop loss para calcular el riesgo');
      return;
    }

    if (!formData.quantity) {
      toast.error('Completa la cantidad para calcular el riesgo');
      return;
    }

    const entryPrice = parseFloat(formData.price);
    const stopPrice = parseFloat(formData.stop_price);
    const quantity = parseFloat(formData.quantity);

    if (entryPrice <= 0 || stopPrice <= 0 || quantity <= 0) {
      toast.error('Los precios y cantidad deben ser mayores a 0');
      return;
    }

    if (formData.side === 'BUY' && stopPrice >= entryPrice) {
      toast.error('Para compras, el stop debe estar por debajo del precio de entrada');
      return;
    }

    if (formData.side === 'SELL' && stopPrice <= entryPrice) {
      toast.error('Para ventas, el stop debe estar por encima del precio de entrada');
      return;
    }

    setIsCalculating(true);
    try {
      // Calcular riesgo real basado en los datos ingresados
      const riskPerShare = Math.abs(entryPrice - stopPrice);
      const totalRiskAmount = riskPerShare * quantity;
      const accountRiskPercent = (totalRiskAmount / currentEquity) * 100;
      
      // Calcular tamaño sugerido para 1% de riesgo
      const defaultRiskPercent = 1.0;
      const maxRiskAmount = (currentEquity * defaultRiskPercent) / 100;
      const suggestedPositionSize = Math.floor(maxRiskAmount / riskPerShare);
      
      const riskCalc: RiskCalculation = {
        suggested_position_size: suggestedPositionSize,
        risk_per_share: riskPerShare,
        risk_amount: totalRiskAmount,
        target_3r: formData.side === 'BUY' 
          ? entryPrice + (3 * riskPerShare)
          : entryPrice - (3 * riskPerShare),
        risk_percent: defaultRiskPercent,
        account_risk_percent: accountRiskPercent
      };

      setRiskCalc(riskCalc);

      toast.success('Cálculo de riesgo actualizado');
    } catch (error) {
      toast.error('Error al calcular el riesgo');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.symbol || !formData.quantity || !formData.price) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    if (parseFloat(formData.quantity) <= 0 || parseFloat(formData.price) <= 0) {
      toast.error('Cantidad y precio deben ser mayores a 0');
      return;
    }

    // Prepare data for API
    const submissionData = {
      symbol: formData.symbol.toUpperCase(),
      side: formData.side,
      quantity: parseFloat(formData.quantity),
      price: parseFloat(formData.price),
      fee: parseFloat(formData.fee),
      executed_at: formData.executed_at,
      notes: formData.notes || undefined,
      entry_reason: formData.entry_reason || undefined,
      exit_reason: formData.exit_reason || undefined,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      // Add risk calculation data for auto-completion
      stop_loss: riskCalc && formData.side === 'BUY' && formData.stop_price ? parseFloat(formData.stop_price) : undefined,
      target_3r: riskCalc?.target_3r,
      risk_amount: riskCalc?.risk_amount,
      account_risk_percent: riskCalc?.account_risk_percent
    };

    try {
      await onSubmit(submissionData);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Información Básica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="symbol">Símbolo *</Label>
              <Input
                id="symbol"
                value={formData.symbol}
                onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                placeholder="AAPL, TSLA..."
                required
              />
            </div>
            <div>
              <Label htmlFor="side">Operación *</Label>
              <Select value={formData.side} onValueChange={(value: any) => setFormData(prev => ({ ...prev, side: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">Compra</SelectItem>
                  <SelectItem value="SELL">Venta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="quantity">Cantidad *</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="100"
                required
              />
            </div>
            <div>
              <Label htmlFor="price">Precio *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="175.50"
                required
              />
            </div>
            <div>
              <Label htmlFor="fee">Comisión (€)</Label>
              <Input
                id="fee"
                type="number"
                step="0.01"
                value={formData.fee}
                onChange={(e) => setFormData(prev => ({ ...prev, fee: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="executed_at">Fecha y Hora</Label>
            <Input
              id="executed_at"
              type="datetime-local"
              value={formData.executed_at}
              onChange={(e) => setFormData(prev => ({ ...prev, executed_at: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Risk Management (only for BUY orders) */}
      {formData.side === 'BUY' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Gestión de Riesgo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="stop_price">Stop Loss (€)</Label>
                <Input
                  id="stop_price"
                  type="number"
                  step="0.01"
                  value={formData.stop_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, stop_price: e.target.value }))}
                  placeholder="165.00"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={calculateRisk}
                  disabled={isCalculating}
                  className="w-full"
                >
                  {isCalculating ? 'Calculando...' : 'Calcular Riesgo'}
                </Button>
              </div>
            </div>

            {riskCalc && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-3">Cálculo de Riesgo</h4>
                <div className="grid gap-3 md:grid-cols-2 text-sm">
                  <div>
                    <span className="text-blue-600">Riesgo por acción:</span>
                    <span className="font-medium ml-2">{formatCurrency(riskCalc.risk_per_share)}</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Riesgo total:</span>
                    <span className="font-medium ml-2 text-red-600">{formatCurrency(riskCalc.risk_amount)}</span>
                  </div>
                  <div>
                    <span className="text-blue-600">% Riesgo cuenta:</span>
                    <span className={`font-medium ml-2 ${riskCalc.account_risk_percent > 2 ? 'text-red-600' : 'text-orange-600'}`}>
                      {riskCalc.account_risk_percent.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-600">Target 3R:</span>
                    <span className="font-medium ml-2 text-green-600">{formatCurrency(riskCalc.target_3r)}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="grid gap-3 md:grid-cols-2 text-sm">
                  <div>
                    <span className="text-blue-600">Tamaño sugerido (1% riesgo):</span>
                    <span className="font-medium ml-2 text-purple-600">{riskCalc.suggested_position_size} acciones</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Equity actual:</span>
                    <span className="font-medium ml-2 text-gray-600">{formatCurrency(currentEquity)}</span>
                  </div>
                  </div>
                </div>
                {riskCalc.account_risk_percent > 2 && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
                    <span className="text-red-700 font-medium">⚠️ Advertencia:</span>
                    <span className="text-red-600 ml-1">El riesgo supera el 2% recomendado de la cuenta</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reasons and Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Motivos y Notas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.side === 'BUY' && (
            <div>
              <Label htmlFor="entry_reason">Motivo de Entrada</Label>
              <Select value={formData.entry_reason} onValueChange={(value) => setFormData(prev => ({ ...prev, entry_reason: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un motivo..." />
                </SelectTrigger>
                <SelectContent>
                  {availableReasons.entry.length === 0 && (
                    <SelectItem value="" disabled>
                      No hay motivos configurados. Ve a Configuración para añadir motivos.
                    </SelectItem>
                  )}
                  {availableReasons.entry.map((reason) => (
                    <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableReasons.entry.length === 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  💡 Ve a Configuración → Motivos de Entrada para añadir opciones
                </p>
              )}
            </div>
          )}

          {formData.side === 'SELL' && (
            <div>
              <Label htmlFor="exit_reason">Motivo de Salida</Label>
              <Select value={formData.exit_reason} onValueChange={(value) => setFormData(prev => ({ ...prev, exit_reason: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un motivo..." />
                </SelectTrigger>
                <SelectContent>
                  {availableReasons.exit.length === 0 && (
                    <SelectItem value="" disabled>
                      No hay motivos configurados. Ve a Configuración para añadir motivos.
                    </SelectItem>
                  )}
                  {availableReasons.exit.map((reason) => (
                    <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableReasons.exit.length === 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  💡 Ve a Configuración → Motivos de Salida para añadir opciones
                </p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas adicionales sobre la operación..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button type="submit" className="flex-1">
          <TrendingUp className="h-4 w-4 mr-2" />
          Registrar Operación
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}