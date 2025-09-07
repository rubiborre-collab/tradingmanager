'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface CashFlow {
  id: string;
  date: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  note?: string;
  created_at: string;
}

interface CashFlowChart {
  date: string;
  cumulative: number;
  deposit: number;
  withdrawal: number;
}

export default function CashFlowsPage() {
  const [cashFlows, setCashFlows] = useState<CashFlow[]>([]);
  const [chartData, setChartData] = useState<CashFlowChart[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCashFlow, setNewCashFlow] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    type: 'DEPOSIT' as 'DEPOSIT' | 'WITHDRAWAL',
    note: ''
  });

  useEffect(() => {
    // Cargar cash flows del localStorage
    const getStoredCashFlows = () => {
      if (typeof window === 'undefined') return [];
      const stored = localStorage.getItem('trading_cash_flows');
      return stored ? JSON.parse(stored) : [];
    };
    
    let storedCashFlows = getStoredCashFlows();
    
    // Si no hay cash flows, crear el depósito inicial
    if (storedCashFlows.length === 0) {
      const initialCashFlow: CashFlow = {
        id: '1',
        date: '2024-01-01',
        amount: 13300,
        type: 'DEPOSIT',
        note: 'Depósito inicial',
        created_at: '2024-01-01T00:00:00Z'
      };
      storedCashFlows = [initialCashFlow];
      localStorage.setItem('trading_cash_flows', JSON.stringify(storedCashFlows));
    }

    setCashFlows(storedCashFlows);

    // Generate chart data
    const sortedFlows = [...storedCashFlows].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let cumulative = 0;
    const chartData: CashFlowChart[] = sortedFlows.map(flow => {
      cumulative += flow.type === 'DEPOSIT' ? flow.amount : -flow.amount;
      return {
        date: flow.date,
        cumulative,
        deposit: flow.type === 'DEPOSIT' ? flow.amount : 0,
        withdrawal: flow.type === 'WITHDRAWAL' ? flow.amount : 0
      };
    });
    setChartData(chartData);
  }, []);

  const totalDeposits = cashFlows
    .filter(cf => cf.type === 'DEPOSIT')
    .reduce((sum, cf) => sum + cf.amount, 0);

  const totalWithdrawals = cashFlows
    .filter(cf => cf.type === 'WITHDRAWAL')
    .reduce((sum, cf) => sum + cf.amount, 0);

  const netCashFlow = totalDeposits - totalWithdrawals;

  const handleAddCashFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCashFlow.amount || parseFloat(newCashFlow.amount) <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    try {
      const cashFlow: CashFlow = {
        id: Date.now().toString(),
        date: newCashFlow.date,
        amount: parseFloat(newCashFlow.amount),
        type: newCashFlow.type,
        note: newCashFlow.note || undefined,
        created_at: new Date().toISOString()
      };

      setCashFlows(prev => [cashFlow, ...prev]);
      
      // Reset form
      setNewCashFlow({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        type: 'DEPOSIT',
        note: ''
      });
      
      setIsAddModalOpen(false);
      toast.success('Movimiento registrado correctamente');
    } catch (error) {
      toast.error('Error al registrar el movimiento');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cash Flows</h1>
          <p className="text-gray-500 mt-2">
            Gestión de depósitos y retiros de capital
          </p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Movimiento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Movimiento de Capital</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddCashFlow} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newCashFlow.date}
                    onChange={(e) => setNewCashFlow(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={newCashFlow.type} onValueChange={(value: any) => setNewCashFlow(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEPOSIT">Depósito</SelectItem>
                      <SelectItem value="WITHDRAWAL">Retiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="amount">Monto (€)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newCashFlow.amount}
                  onChange={(e) => setNewCashFlow(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="note">Nota (opcional)</Label>
                <Textarea
                  id="note"
                  placeholder="Descripción del movimiento..."
                  value={newCashFlow.note}
                  onChange={(e) => setNewCashFlow(prev => ({ ...prev, note: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  Registrar
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Depósitos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalDeposits)}
            </div>
            <p className="text-xs text-muted-foreground">
              {cashFlows.filter(cf => cf.type === 'DEPOSIT').length} movimientos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Retiros</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalWithdrawals)}
            </div>
            <p className="text-xs text-muted-foreground">
              {cashFlows.filter(cf => cf.type === 'WITHDRAWAL').length} movimientos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capital Neto</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(netCashFlow)}
            </div>
            <p className="text-xs text-muted-foreground">
              Capital disponible
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución del Capital</CardTitle>
          <CardDescription>
            Historial acumulativo de depósitos y retiros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => formatDate(value)}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => `€${value.toLocaleString()}`}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Capital Acumulado']}
                labelFormatter={(label) => `Fecha: ${formatDate(label)}`}
              />
              <Line 
                type="monotone" 
                dataKey="cumulative" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cash Flows Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Movimientos</CardTitle>
          <CardDescription>
            Lista completa de todos los depósitos y retiros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Registrado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashFlows
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((cashFlow) => (
                <TableRow key={cashFlow.id}>
                  <TableCell>{formatDate(cashFlow.date)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={cashFlow.type === 'DEPOSIT' ? 'default' : 'destructive'}
                      className={cashFlow.type === 'DEPOSIT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                    >
                      {cashFlow.type === 'DEPOSIT' ? 'Depósito' : 'Retiro'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={cashFlow.type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'}>
                      {cashFlow.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(cashFlow.amount)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-48 truncate">
                    {cashFlow.note || '-'}
                  </TableCell>
                  <TableCell>{formatDate(cashFlow.created_at, true)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}