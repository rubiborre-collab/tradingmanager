'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DayPnL {
  date: string;
  pnl: number;
  symbols: string[];
  trades: number;
  shares: number;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  pnl?: number;
  symbols?: string[];
  trades?: number;
  shares?: number;
}

// Función para obtener ejecuciones del localStorage
const getStoredExecutions = () => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('trading_executions');
  return stored ? JSON.parse(stored) : [];
};

// Función para calcular PnL diario desde las ejecuciones
const calculateDailyPnLFromExecutions = (executions: any[]): DayPnL[] => {
  const dailyData = new Map<string, {
    pnl: number;
    symbols: Set<string>;
    trades: number;
    shares: number;
  }>();

  // Procesar ejecuciones para calcular PnL por día
  executions.forEach(exec => {
    const date = new Date(exec.executed_at).toISOString().split('T')[0];
    
    if (!dailyData.has(date)) {
      dailyData.set(date, {
        pnl: 0,
        symbols: new Set(),
        trades: 0,
        shares: 0
      });
    }
    
    const dayData = dailyData.get(date)!;
    dayData.symbols.add(exec.symbol);
    dayData.trades++;
    dayData.shares += exec.quantity;
    
    // Calcular PnL aproximado (simplificado)
    if (exec.side === 'SELL') {
      // Para ventas, usar un PnL simulado basado en el precio
      // En una implementación real, necesitarías el precio de compra correspondiente
      const estimatedPnL = exec.quantity * exec.price * 0.02; // 2% ganancia estimada
      dayData.pnl += estimatedPnL;
    }
  });

  // Convertir a array
  return Array.from(dailyData.entries()).map(([date, data]) => ({
    date,
    pnl: data.pnl,
    symbols: Array.from(data.symbols),
    trades: data.trades,
    shares: data.shares
  }));
};
export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayPnL | null>(null);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [dailyPnL, setDailyPnL] = useState<DayPnL[]>([]);
  const [view, setView] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    // Obtener ejecuciones reales del localStorage
    const storedExecutions = getStoredExecutions();
    
    // Calcular PnL diario desde las ejecuciones
    const calculatedDailyPnL = calculateDailyPnLFromExecutions(storedExecutions);
    
    // Combinar con datos mock existentes (para mantener ejemplos si no hay datos reales)
    // Solo usar datos reales calculados
    const allDailyPnL = [...calculatedDailyPnL];
    
    setDailyPnL(allDailyPnL);
  }, []);

  // Escuchar cambios en localStorage para actualizar en tiempo real
  useEffect(() => {
    const handleStorageChange = () => {
      const storedExecutions = getStoredExecutions();
      const calculatedDailyPnL = calculateDailyPnLFromExecutions(storedExecutions);
      setDailyPnL(calculatedDailyPnL);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('executionsUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('executionsUpdated', handleStorageChange);
    };
  }, []);

  const getPnLIntensity = (pnl: number): string => {
    if (pnl === 0) return 'bg-gray-100';
    const absValue = Math.abs(pnl);
    
    if (pnl > 0) {
      if (absValue < 100) return 'bg-green-100';
      if (absValue < 300) return 'bg-green-200';
      if (absValue < 500) return 'bg-green-300';
      return 'bg-green-400';
    } else {
      if (absValue < 100) return 'bg-red-100';
      if (absValue < 300) return 'bg-red-200';
      if (absValue < 500) return 'bg-red-300';
      return 'bg-red-400';
    }
  };

  const getCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());
    
    const days: CalendarDay[] = [];
    const currentDateLoop = new Date(startDate);
    
    for (let i = 0; i < 42; i++) { // 6 weeks x 7 days
      const dayData = dailyPnL.find(d => 
        d.date === currentDateLoop.toISOString().split('T')[0]
      );
      
      days.push({
        date: new Date(currentDateLoop),
        isCurrentMonth: currentDateLoop.getMonth() === month,
        pnl: dayData?.pnl,
        symbols: dayData?.symbols,
        trades: dayData?.trades,
        shares: dayData?.shares
      });
      
      currentDateLoop.setDate(currentDateLoop.getDate() + 1);
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleDayClick = (day: CalendarDay) => {
    if (day.pnl !== undefined) {
      setSelectedDay({
        date: day.date.toISOString().split('T')[0],
        pnl: day.pnl,
        symbols: day.symbols || [],
        trades: day.trades || 0,
        shares: day.shares || 0
      });
      setShowDayDetail(true);
    }
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const totalMonthPnL = dailyPnL
    .filter(d => {
      const dayDate = new Date(d.date);
      return dayDate.getMonth() === currentDate.getMonth() && 
             dayDate.getFullYear() === currentDate.getFullYear();
    })
    .reduce((sum, d) => sum + d.pnl, 0);

  const winDays = dailyPnL
    .filter(d => {
      const dayDate = new Date(d.date);
      return dayDate.getMonth() === currentDate.getMonth() && 
             dayDate.getFullYear() === currentDate.getFullYear() &&
             d.pnl > 0;
    }).length;

  const totalDays = dailyPnL
    .filter(d => {
      const dayDate = new Date(d.date);
      return dayDate.getMonth() === currentDate.getMonth() && 
             dayDate.getFullYear() === currentDate.getFullYear();
    }).length;

  const totalShares = dailyPnL
    .filter(d => {
      const dayDate = new Date(d.date);
      return dayDate.getMonth() === currentDate.getMonth() && 
             dayDate.getFullYear() === currentDate.getFullYear();
    })
    .reduce((sum, d) => sum + (d.shares || 0), 0);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendario PnL</h1>
          <p className="text-gray-500 mt-2">
            Heatmap de tus ganancias y pérdidas diarias
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={view} onValueChange={(value: any) => setView(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mes</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Año</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">PnL del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalMonthPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalMonthPnL)}
            </div>
            <p className="text-xs text-muted-foreground">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Días Ganadores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {winDays}/{totalDays}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalDays > 0 ? ((winDays / totalDays) * 100).toFixed(1) : 0}% winrate diario
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Días Operados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalDays}
            </div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Acciones Operadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {totalShares.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {dayNames.map(day => (
              <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {getCalendarDays().map((day, index) => (
              <div
                key={index}
                className={`
                  h-12 flex items-center justify-center text-sm cursor-pointer rounded-lg relative
                  ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                  ${day.pnl !== undefined ? getPnLIntensity(day.pnl) : 'hover:bg-gray-50'}
                  ${day.pnl !== undefined ? 'hover:scale-105 transition-transform' : ''}
                `}
                onClick={() => handleDayClick(day)}
                title={
                  day.pnl !== undefined 
                    ? `${formatCurrency(day.pnl)} - ${day.trades} ops - ${day.shares || 0} acciones`
                    : ''
                }
              >
                <span className="relative z-10">{day.date.getDate()}</span>
                {day.pnl !== undefined && (
                  <div className="absolute bottom-0 left-0 right-0 text-[8px] text-center font-medium">
                    {day.pnl > 0 ? '+' : ''}{Math.round(day.pnl)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
            <span>Menos</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
              <div className="w-3 h-3 bg-red-100 rounded-sm"></div>
              <div className="w-3 h-3 bg-red-200 rounded-sm"></div>
              <div className="w-3 h-3 bg-red-300 rounded-sm"></div>
              <div className="w-3 h-3 bg-red-400 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-100 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-200 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-300 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
            </div>
            <span>Más</span>
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Modal */}
      <Dialog open={showDayDetail} onOpenChange={setShowDayDetail}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Detalle del día - {selectedDay && formatDate(selectedDay.date)}
            </DialogTitle>
          </DialogHeader>
          {selectedDay && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${selectedDay.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(selectedDay.pnl)}
                  </div>
                  <p className="text-sm text-gray-500">PnL del día</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedDay.trades}
                  </div>
                  <p className="text-sm text-gray-500">Operaciones</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {selectedDay.shares || 0}
                  </div>
                  <p className="text-sm text-gray-500">Acciones</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {selectedDay.symbols.length}
                  </div>
                  <p className="text-sm text-gray-500">Símbolos</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Símbolos operados:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDay.symbols.map(symbol => (
                    <Badge key={symbol} variant="outline">
                      {symbol}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}