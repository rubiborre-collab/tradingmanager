'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Eye, Activity } from 'lucide-react';
import { formatCurrency, formatDate, formatPercent } from '@/lib/utils';
import Link from 'next/link';

// Función para calcular equity actual dinámicamente
function calculateCurrentEquity(): number {
  const initialCapital = 13300;
  
  // Obtener cash flows del localStorage
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
}

interface Position {
  id: string;
  symbol: string;
  open_quantity: number;
  avg_cost: number;
  realized_pnl: number;
  unrealized_pnl: number;
  max_drawdown: number;
  created_at: string;
  closed_at?: string;
  current_price?: number; // For unrealized PnL calculation
  stop_loss?: number;
  target_3r?: number;
  close_reason?: string;
  close_notes?: string;
}

// Función para obtener ejecuciones del localStorage (simulando persistencia)
const getStoredExecutions = () => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('trading_executions');
  return stored ? JSON.parse(stored) : [];
};

// Función para calcular posiciones basadas en ejecuciones
const calculatePositionsFromExecutions = (executions: any[]): Position[] => {
  const positionMap = new Map<string, any>();
  
  // Procesar ejecuciones ordenadas por fecha
  const sortedExecutions = executions.sort((a, b) => 
    new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime()
  );
  
  sortedExecutions.forEach(exec => {
    const symbol = exec.symbol;
    
    if (!positionMap.has(symbol)) {
      positionMap.set(symbol, {
        id: `pos_${symbol}`,
        symbol,
        open_quantity: 0,
        avg_cost: 0,
        realized_pnl: 0,
        unrealized_pnl: 0,
        max_drawdown: 0,
        created_at: exec.executed_at,
        closed_at: null,
        current_price: null,
        stop_loss: exec.stop_loss,
        target_3r: exec.target_3r,
        executions: []
      });
    }
    
    const position = positionMap.get(symbol);
    position.executions.push(exec);
    
    if (exec.side === 'BUY') {
      const newQuantity = position.open_quantity + exec.quantity;
      position.avg_cost = newQuantity > 0 
        ? ((position.avg_cost * position.open_quantity) + (exec.price * exec.quantity)) / newQuantity
        : 0;
      position.open_quantity = newQuantity;
      
      // Actualizar stop loss y target si están definidos
      if (exec.stop_loss) position.stop_loss = exec.stop_loss;
      if (exec.target_3r) position.target_3r = exec.target_3r;
      
    } else if (exec.side === 'SELL') {
      position.open_quantity -= exec.quantity;
      
      // Simular PnL realizado (simplificado)
      const pnl = (exec.price - position.avg_cost) * exec.quantity - exec.fee;
      position.realized_pnl += pnl;
      
      // Si la posición se cierra completamente
      if (position.open_quantity <= 0) {
        position.closed_at = exec.executed_at;
        position.close_reason = exec.exit_reason || 'Venta completa';
        position.close_notes = exec.notes;
      }
    }
    
    // Simular precio actual para posiciones abiertas (precio + variación aleatoria)
    if (position.open_quantity > 0) {
      const variation = (Math.random() - 0.5) * 0.05; // ±2.5% variación
      position.current_price = position.avg_cost * (1 + variation);
      position.unrealized_pnl = (position.current_price - position.avg_cost) * position.open_quantity;
    }
  });
  
  return Array.from(positionMap.values());
};

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
  const [closedPositions, setClosedPositions] = useState<Position[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [currentEquity, setCurrentEquity] = useState(13300);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Calcular equity actual
    const equity = calculateCurrentEquity();
    setCurrentEquity(equity);
    
    // Obtener ejecuciones almacenadas y calcular posiciones
    const storedExecutions = getStoredExecutions();
    let calculatedPositions: Position[] = [];
    
    if (storedExecutions.length > 0) {
      calculatedPositions = calculatePositionsFromExecutions(storedExecutions);
    }
    
    // Solo usar posiciones calculadas, sin datos mock
    const allPositions = [...calculatedPositions];
    
    setPositions(allPositions);
    setOpenPositions(allPositions.filter(p => !p.closed_at));
    setClosedPositions(allPositions.filter(p => p.closed_at));
  }, [searchParams]); // Re-ejecutar cuando cambien los parámetros (ej: al volver del blotter)

  // Escuchar cambios en localStorage para actualizar en tiempo real
  useEffect(() => {
    const handleStorageChange = () => {
      // Forzar re-render cuando cambien las ejecuciones
      window.location.reload();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // También escuchar eventos custom para cambios en la misma pestaña
    window.addEventListener('executionsUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('executionsUpdated', handleStorageChange);
    };
  }, []);

  const handleViewDetail = (position: Position) => {
    setSelectedPosition(position);
    setShowDetail(true);
  };

  const calculateTotalPnL = (position: Position) => {
    return position.realized_pnl + position.unrealized_pnl;
  };

  const calculatePnLPercent = (position: Position) => {
    const totalInvested = position.avg_cost * Math.abs(position.open_quantity || 1);
    const totalPnL = calculateTotalPnL(position);
    return totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
  };

  const calculatePositionValue = (position: Position) => {
    if (position.open_quantity > 0) {
      return (position.current_price || position.avg_cost) * position.open_quantity;
    }
    return position.avg_cost * Math.abs(position.open_quantity || 1);
  };

  const calculateAccountPercent = (position: Position) => {
    const positionValue = calculatePositionValue(position);
    return (positionValue / currentEquity) * 100;
  };

  const calculatePnLOverEquity = (position: Position) => {
    return (position.realized_pnl / currentEquity) * 100;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Posiciones</h1>
        <p className="text-gray-500 mt-2">
          Vista general de tus posiciones abiertas y cerradas
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posiciones Abiertas</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openPositions.length}</div>
            <p className="text-xs text-muted-foreground">
              PnL No Realizado: {formatCurrency(openPositions.reduce((sum, p) => sum + p.unrealized_pnl, 0))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posiciones Cerradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closedPositions.length}</div>
            <p className="text-xs text-muted-foreground">
              PnL Realizado: {formatCurrency(closedPositions.reduce((sum, p) => sum + p.realized_pnl, 0))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PnL Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(positions.reduce((sum, p) => sum + calculateTotalPnL(p), 0))}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Todas las posiciones</span>
              <span className="text-green-600 font-medium">
                ({formatPercent(positions.reduce((sum, p) => sum + calculatePnLOverEquity(p), 0))})
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Open Positions */}
      {openPositions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Posiciones Abiertas
            </CardTitle>
            <CardDescription>
              Posiciones actualmente abiertas en tu cartera
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Símbolo</TableHead>
                  <TableHead>Cantidad Abierta</TableHead>
                  <TableHead>Precio Medio</TableHead>
                  <TableHead>Stop Loss</TableHead>
                  <TableHead>Target 3R</TableHead>
                  <TableHead>% Riesgo Cuenta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openPositions.map((position) => (
                  <TableRow key={position.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{position.symbol}</span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewDetail(position)}
                          className="h-6 w-6 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{position.open_quantity}</TableCell>
                    <TableCell>{formatCurrency(position.avg_cost)}</TableCell>
                    <TableCell>
                      {position.stop_loss ? (
                        <div className="text-red-600 font-medium">
                          <div>{formatCurrency(position.stop_loss)}</div>
                          <div className="text-xs text-red-500">
                            {(((position.avg_cost - position.stop_loss) / position.avg_cost) * 100).toFixed(1)}% SL
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {position.target_3r ? (
                        <span className="text-green-600 font-medium">
                          {formatCurrency(position.target_3r)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {position.stop_loss ? (
                        <div className="text-center">
                          <div className="text-orange-600 font-medium">
                            {(((position.avg_cost - position.stop_loss) * position.open_quantity / currentEquity) * 100).toFixed(2)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency((position.avg_cost - position.stop_loss) * position.open_quantity)} riesgo
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Closed Positions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Posiciones Cerradas
          </CardTitle>
          <CardDescription>
            Historial de posiciones completadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Símbolo</TableHead>
                <TableHead>Precio Medio</TableHead>
                <TableHead>PnL Realizado</TableHead>
                <TableHead>% Equity</TableHead>
                <TableHead>Motivo Cierre</TableHead>
                <TableHead>Abierta</TableHead>
                <TableHead>Cerrada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closedPositions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{position.symbol}</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewDetail(position)}
                        className="h-6 w-6 p-0"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(position.avg_cost)}</TableCell>
                  <TableCell>
                    <span className={position.realized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(position.realized_pnl)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={calculatePnLOverEquity(position) >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatPercent(calculatePnLOverEquity(position))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      {position.close_reason && (
                        <Badge variant="outline" className="mb-1">
                          {position.close_reason}
                        </Badge>
                      )}
                      {position.close_notes && (
                        <p className="text-xs text-gray-500 max-w-32 truncate" title={position.close_notes}>
                          {position.close_notes}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(position.created_at)}</TableCell>
                  <TableCell>{position.closed_at ? formatDate(position.closed_at) : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Position Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalle de Posición - {selectedPosition?.symbol}
            </DialogTitle>
          </DialogHeader>
          {selectedPosition && (
            <PositionDetail position={selectedPosition} currentEquity={currentEquity} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PositionDetail({ position, currentEquity }: { position: Position; currentEquity: number }) {
  const [executions, setExecutions] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);

  // Mock data - replace with API call
  useEffect(() => {
    const mockExecutions = [
      {
        id: '1',
        side: 'BUY',
        quantity: 100,
        price: 170.50,
        executed_at: '2024-04-01T10:00:00Z',
        entry_reason: 'Breakout alcista',
        fee: 0.34,
        account_percent: ((170.50 * 100) / currentEquity) * 100
      },
      {
        id: '2',
        side: 'BUY',
        quantity: 50,
        price: 175.80,
        executed_at: '2024-04-05T14:30:00Z',
        entry_reason: 'Promedio hacia abajo',
        fee: 0.34,
        account_percent: ((175.80 * 50) / currentEquity) * 100
      }
    ];

    const mockLots = [
      {
        id: '1',
        quantity: 100,
        price: 170.50,
        qty_remaining: 0,
        created_at: '2024-04-01T10:00:00Z',
        pnl_accumulated: 450.25
      },
      {
        id: '2',
        quantity: 50,
        price: 175.80,
        qty_remaining: 50,
        created_at: '2024-04-05T14:30:00Z',
        pnl_accumulated: 0
      }
    ];

    setExecutions(mockExecutions);
    setLots(mockLots);
  }, [position]);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{position.open_quantity}</div>
            <p className="text-sm text-gray-500">Cantidad Abierta</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{formatCurrency(position.avg_cost)}</div>
            <p className="text-sm text-gray-500">Precio Medio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className={`text-2xl font-bold ${position.realized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(position.realized_pnl)}
            </div>
            <p className="text-sm text-gray-500">PnL Realizado</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className={`text-2xl font-bold ${position.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(position.unrealized_pnl)}
            </div>
            <p className="text-sm text-gray-500">PnL No Realizado</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Management Info */}
      {(position.stop_loss || position.target_3r) && (
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Riesgo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {position.stop_loss && (
                <div className="text-center p-4 border rounded-lg bg-red-50">
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(position.stop_loss)}
                  </div>
                  <p className="text-sm text-red-700">Stop Loss</p>
                </div>
              )}
              {position.target_3r && (
                <div className="text-center p-4 border rounded-lg bg-green-50">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(position.target_3r)}
                  </div>
                  <p className="text-sm text-green-700">Target 3R</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {/* Executions Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline de Ejecuciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Operación</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>% Cuenta</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((execution) => (
                <TableRow key={execution.id}>
                  <TableCell>{formatDate(execution.executed_at, true)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={execution.side === 'BUY' ? 'default' : 'secondary'}
                      className={execution.side === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                    >
                      {execution.side === 'BUY' ? 'Compra' : 'Venta'}
                    </Badge>
                  </TableCell>
                  <TableCell>{execution.quantity}</TableCell>
                  <TableCell>{formatCurrency(execution.price)}</TableCell>
                  <TableCell>
                    <span className="text-blue-600 font-medium">
                      {formatPercent(execution.account_percent)}
                    </span>
                  </TableCell>
                  <TableCell>{formatCurrency(execution.fee)}</TableCell>
                  <TableCell className="max-w-40 truncate">
                    {execution.entry_reason || execution.exit_reason || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* FIFO Lots */}
      <Card>
        <CardHeader>
          <CardTitle>Lotes FIFO</CardTitle>
          <CardDescription>
            Estado de los lotes de compra para matching FIFO
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha Compra</TableHead>
                <TableHead>Cantidad Original</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Cantidad Restante</TableHead>
                <TableHead>PnL Acumulado</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map((lot) => (
                <TableRow key={lot.id}>
                  <TableCell>{formatDate(lot.created_at, true)}</TableCell>
                  <TableCell>{lot.quantity}</TableCell>
                  <TableCell>{formatCurrency(lot.price)}</TableCell>
                  <TableCell>{lot.qty_remaining}</TableCell>
                  <TableCell>
                    <span className={lot.pnl_accumulated >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(lot.pnl_accumulated)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={lot.qty_remaining > 0 ? 'default' : 'secondary'}>
                      {lot.qty_remaining > 0 ? 'Activo' : 'Agotado'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}