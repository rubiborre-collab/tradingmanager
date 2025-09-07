'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Filter, Download, Edit, Plus, FileText, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

import { ExecutionForm } from '@/components/trading/ExecutionForm';

interface Execution {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  fee: number;
  executed_at: string;
  notes?: string;
  entry_reason?: string;
  exit_reason?: string;
  status: 'INCOMPLETO' | 'COMPLETO';
  external_id?: string;
  tags?: string[];
  stop_loss?: number;
  target_3r?: number;
  risk_amount?: number;
  account_risk_percent?: number;
}

// Función para guardar ejecuciones en localStorage (simulando persistencia)
const saveExecutionsToStorage = (executions: Execution[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('trading_executions', JSON.stringify(executions));
    // Disparar evento custom para notificar cambios
    window.dispatchEvent(new CustomEvent('executionsUpdated'));
  }
};

// Función para obtener ejecuciones del localStorage
const getStoredExecutions = (): Execution[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('trading_executions');
  return stored ? JSON.parse(stored) : [];
};

export default function BlotterPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [filteredExecutions, setFilteredExecutions] = useState<Execution[]>([]);
  const [paginatedExecutions, setPaginatedExecutions] = useState<Execution[]>([]);
  const [availableReasons, setAvailableReasons] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  
  const [filters, setFilters] = useState({
    symbol: '',
    side: 'all',
    status: 'all_status',
    reason: 'all_reasons',
    from: '',
    to: ''
  });
  const [editingExecution, setEditingExecution] = useState<Execution | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    // Cargar ejecuciones del localStorage primero
    const storedExecutions = getStoredExecutions();
    
    // Solo usar ejecuciones almacenadas, sin datos mock
    const allExecutions = [...storedExecutions];
    
    setExecutions(allExecutions);
    setFilteredExecutions(allExecutions);
    
    // Extraer motivos únicos de las operaciones
    const reasons = new Set<string>();
    allExecutions.forEach(exec => {
      if (exec.entry_reason) reasons.add(exec.entry_reason);
      if (exec.exit_reason) reasons.add(exec.exit_reason);
    });
    setAvailableReasons(Array.from(reasons).sort());
  }, []);

  useEffect(() => {
    let filtered = executions;

    if (filters.symbol) {
      filtered = filtered.filter(exec => 
        exec.symbol.toLowerCase().includes(filters.symbol.toLowerCase())
      );
    }

    if (filters.side && filters.side !== 'all') {
      filtered = filtered.filter(exec => exec.side === filters.side);
    }

    if (filters.status && filters.status !== 'all_status') {
      filtered = filtered.filter(exec => exec.status === filters.status);
    }

    if (filters.reason && filters.reason !== 'all_reasons') {
      filtered = filtered.filter(exec => 
        exec.entry_reason === filters.reason || exec.exit_reason === filters.reason
      );
    }

    if (filters.from) {
      filtered = filtered.filter(exec => 
        new Date(exec.executed_at) >= new Date(filters.from)
      );
    }

    if (filters.to) {
      filtered = filtered.filter(exec => 
        new Date(exec.executed_at) <= new Date(filters.to)
      );
    }

    setFilteredExecutions(filtered);
    
    // Reset página cuando cambien los filtros
    setCurrentPage(1);
  }, [executions, filters]);

  // Efecto para paginación
  useEffect(() => {
    const total = Math.ceil(filteredExecutions.length / itemsPerPage);
    setTotalPages(total);
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filteredExecutions.slice(startIndex, endIndex);
    
    setPaginatedExecutions(paginated);
  }, [filteredExecutions, currentPage]);

  const handleEditExecution = (execution: Execution) => {
    setEditingExecution(execution);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (updatedData: Partial<Execution>) => {
    if (!editingExecution) return;

    try {
      // API call would go here
      console.log('Updating execution:', updatedData);
      
      const updated = executions.map(exec => 
        exec.id === editingExecution.id 
          ? { ...exec, ...updatedData }
          : exec
      );
      
      setExecutions(updated);
      
      // Guardar cambios en localStorage
      saveExecutionsToStorage(updated);
      
      setIsEditModalOpen(false);
      setEditingExecution(null);
      toast.success('Ejecución actualizada');
    } catch (error) {
      toast.error('Error al actualizar la ejecución');
    }
  };

  const handleAddExecution = async (executionData: any) => {
    try {
      // API call would go here
      console.log('Creating execution:', executionData);
      
      const newExecution: Execution = {
        id: Date.now().toString(),
        ...executionData,
        status: (executionData.side === 'BUY' && !executionData.entry_reason) || 
                (executionData.side === 'SELL' && !executionData.exit_reason)
                ? 'INCOMPLETO' : 'COMPLETO'
      };
      
      setExecutions(prev => [newExecution, ...prev]);
      
      // Guardar en localStorage
      const updatedExecutions = [newExecution, ...executions];
      saveExecutionsToStorage(updatedExecutions);
      
      setIsAddModalOpen(false);
      toast.success('Operación registrada correctamente');
    } catch (error) {
      toast.error('Error al registrar la operación');
    }
  };

  const handleDeleteExecution = async (executionId: string) => {
    try {
      const updated = executions.filter(exec => exec.id !== executionId);
      setExecutions(updated);
      
      // Guardar cambios en localStorage
      saveExecutionsToStorage(updated);
      
      toast.success('Operación eliminada correctamente');
    } catch (error) {
      toast.error('Error al eliminar la operación');
    }
  };

  const exportToCSV = () => {
    const headers = ['Símbolo', 'Operación', 'Cantidad', 'Precio', 'Stop Loss', 'Target 3R', '% Riesgo', 'Comisión', 'Fecha', 'Estado', 'Motivo', 'Notas'];
    const csvContent = [
      headers.join(','),
      ...filteredExecutions.map(exec => [
        exec.symbol,
        exec.side,
        exec.quantity,
        exec.price,
        exec.stop_loss || '',
        exec.target_3r || '',
        exec.account_risk_percent ? exec.account_risk_percent.toFixed(2) + '%' : '',
        exec.fee,
        formatDate(exec.executed_at, true),
        exec.status,
        exec.entry_reason || exec.exit_reason || '',
        exec.notes || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blotter_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Archivo CSV descargado');
  };

  const exportToPDF = () => {
    try {
      import('jspdf').then(({ default: jsPDF }) => {
        import('jspdf-autotable').then(() => {
          const doc = new jsPDF();
        
          // Título del documento
          doc.setFontSize(20);
          doc.text('Blotter - Registro de Operaciones', 20, 20);
        
          // Información del filtro
          doc.setFontSize(12);
          let yPos = 35;
          if (filters.symbol) {
            doc.text(`Símbolo: ${filters.symbol}`, 20, yPos);
            yPos += 7;
          }
          if (filters.side && filters.side !== 'all') {
            doc.text(`Operación: ${filters.side === 'BUY' ? 'Compra' : 'Venta'}`, 20, yPos);
            yPos += 7;
          }
          if (filters.from || filters.to) {
            doc.text(`Período: ${filters.from || 'Inicio'} - ${filters.to || 'Fin'}`, 20, yPos);
            yPos += 7;
          }
        
          // Preparar datos para la tabla
          const tableData = filteredExecutions.map(exec => [
            exec.symbol,
            exec.side === 'BUY' ? 'Compra' : 'Venta',
            formatDate(exec.executed_at, true),
            exec.quantity.toString(),
            formatCurrency(exec.price),
            exec.side === 'BUY' && exec.stop_loss ? formatCurrency(exec.stop_loss) : '-',
            exec.side === 'BUY' && exec.target_3r ? formatCurrency(exec.target_3r) : '-',
            exec.side === 'BUY' && exec.account_risk_percent ? exec.account_risk_percent.toFixed(2) + '%' : '-',
            exec.status,
            exec.entry_reason || exec.exit_reason || '-',
            exec.notes || '-',
            formatCurrency(exec.fee)
          ]);
        
          // Crear tabla
          (doc as any).autoTable({
            startY: yPos + 10,
            head: [['Símbolo', 'Operación', 'Fecha', 'Cantidad', 'Precio', 'Stop Loss', '3R', '% Riesgo', 'Estado', 'Motivo', 'Notas', 'Comisión']],
            body: tableData,
            styles: {
              fontSize: 8,
              cellPadding: 2
            },
            headStyles: {
              fillColor: [59, 130, 246],
              textColor: 255,
              fontSize: 9
            },
            columnStyles: {
              0: { cellWidth: 15 }, // Símbolo
              1: { cellWidth: 18 }, // Operación
              2: { cellWidth: 25 }, // Fecha
              3: { cellWidth: 15 }, // Cantidad
              4: { cellWidth: 18 }, // Precio
              5: { cellWidth: 18 }, // Stop Loss
              6: { cellWidth: 18 }, // 3R
              7: { cellWidth: 15 }, // % Riesgo
              8: { cellWidth: 20 }, // Estado
              9: { cellWidth: 25 }, // Motivo
              10: { cellWidth: 30 }, // Notas
              11: { cellWidth: 15 } // Comisión
            },
            margin: { left: 10, right: 10 }
          });
        
          // Pie de página
          const pageCount = doc.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(
              `Página ${i} de ${pageCount} - Generado el ${new Date().toLocaleDateString('es-ES')}`,
              20,
              doc.internal.pageSize.height - 10
            );
          }
        
          // Descargar el PDF
          const fileName = `blotter_${new Date().toISOString().split('T')[0]}.pdf`;
          doc.save(fileName);
        
          toast.success('PDF descargado correctamente');
        }).catch((error) => {
          console.error('Error loading jspdf-autotable:', error);
          toast.error('Error al cargar la extensión de PDF');
        });
      }).catch((error) => {
        console.error('Error loading jsPDF:', error);
        toast.error('Error al cargar la librería de PDF');
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blotter</h1>
          <p className="text-gray-500 mt-2">
            Registro completo de todas tus ejecuciones
          </p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Operación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Nueva Operación</DialogTitle>
            </DialogHeader>
            <ExecutionForm
              onSubmit={handleAddExecution}
              onCancel={() => setIsAddModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            <div>
              <Label htmlFor="symbol">Símbolo</Label>
              <Input
                id="symbol"
                placeholder="AAPL, TSLA..."
                value={filters.symbol}
                onChange={(e) => setFilters(prev => ({ ...prev, symbol: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="side">Operación</Label>
              <Select value={filters.side} onValueChange={(value) => setFilters(prev => ({ ...prev, side: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="BUY">Compra</SelectItem>
                  <SelectItem value="SELL">Venta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Estado</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_status">Todos</SelectItem>
                  <SelectItem value="COMPLETO">Completo</SelectItem>
                  <SelectItem value="INCOMPLETO">Incompleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reason">Motivo</Label>
              <Select value={filters.reason} onValueChange={(value) => setFilters(prev => ({ ...prev, reason: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_reasons">Todos los motivos</SelectItem>
                  {availableReasons.map(reason => (
                    <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="from">Desde</Label>
              <Input
                id="from"
                type="date"
                value={filters.from}
                onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="to">Hasta</Label>
              <Input
                id="to"
                type="date"
                value={filters.to}
                onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={exportToPDF} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          Mostrando {paginatedExecutions.length} de {filteredExecutions.length} ejecuciones
        </div>
      </div>

      {/* Executions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ejecuciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Símbolo</TableHead>
                <TableHead>Operación</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Stop Loss</TableHead>
                <TableHead>Target 3R</TableHead>
                <TableHead>% Riesgo</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedExecutions.map((execution) => (
                <TableRow key={execution.id}>
                  <TableCell className="font-medium">{execution.symbol}</TableCell>
                  <TableCell>
                    <Badge
                      variant={execution.side === 'BUY' ? 'default' : 'secondary'}
                      className={execution.side === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                    >
                      {execution.side === 'BUY' ? 'Compra' : 'Venta'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(execution.executed_at, true)}</TableCell>
                  <TableCell>{execution.quantity}</TableCell>
                  <TableCell>{formatCurrency(execution.price)}</TableCell>
                  <TableCell>
                    {execution.side === 'BUY' && execution.stop_loss ? (
                      <span className="text-red-600 font-medium">
                        {formatCurrency(execution.stop_loss)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {execution.side === 'BUY' && execution.target_3r ? (
                      <span className="text-green-600 font-medium">
                        {formatCurrency(execution.target_3r)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {execution.side === 'BUY' && execution.account_risk_percent ? (
                      <span className="text-orange-600 font-medium">
                        {execution.account_risk_percent.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-32 truncate">
                    {execution.entry_reason || execution.exit_reason || '-'}
                  </TableCell>
                  <TableCell className="max-w-40 truncate">
                    {execution.notes || '-'}
                  </TableCell>
                  <TableCell>{formatCurrency(execution.fee)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={execution.status === 'COMPLETO' ? 'default' : 'destructive'}
                      className={execution.status === 'COMPLETO' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}
                    >
                      {execution.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditExecution(execution)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar operación?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará permanentemente la operación de {execution.symbol} ({execution.side}) por {formatCurrency(execution.price)}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteExecution(execution.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  // Mostrar solo páginas relevantes (primera, última, actual y adyacentes)
                  const showPage = page === 1 || 
                                 page === totalPages || 
                                 Math.abs(page - currentPage) <= 1;
                  
                  const showEllipsis = (page === 2 && currentPage > 4) || 
                                     (page === totalPages - 1 && currentPage < totalPages - 3);
                  
                  if (!showPage && !showEllipsis) return null;
                  
                  if (showEllipsis) {
                    return (
                      <span key={`ellipsis-${page}`} className="px-2 text-gray-500">
                        …
                      </span>
                    );
                  }
                  
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Completar Ejecución</DialogTitle>
          </DialogHeader>
          {editingExecution && (
            <EditExecutionForm 
              execution={editingExecution}
              onSave={handleSaveEdit}
              onCancel={() => setIsEditModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditExecutionForm({ 
  execution, 
  onSave, 
  onCancel 
}: { 
  execution: Execution;
  onSave: (data: Partial<Execution>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    notes: execution.notes || '',
    entry_reason: execution.entry_reason || '',
    exit_reason: execution.exit_reason || '',
    status: execution.status,
    stop_loss: execution.stop_loss?.toString() || '',
    target_3r: execution.target_3r?.toString() || ''
  });

  // Calcular Target 3R automáticamente cuando cambia Stop Loss
  const calculateTarget3R = (price: number, stopLoss: number) => {
    const risk = Math.abs(price - stopLoss);
    return price + (3 * risk);
  };

  const handleStopLossChange = (value: string) => {
    setFormData(prev => ({ ...prev, stop_loss: value }));
    
    if (value && execution.side === 'BUY') {
      const stopLoss = parseFloat(value);
      if (!isNaN(stopLoss) && stopLoss > 0) {
        const target3R = calculateTarget3R(execution.price, stopLoss);
        setFormData(prev => ({ ...prev, target_3r: target3R.toFixed(2) }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-set to COMPLETO if reasons are provided
    let finalStatus = formData.status;
    if ((execution.side === 'BUY' && formData.entry_reason) || 
        (execution.side === 'SELL' && formData.exit_reason)) {
      finalStatus = 'COMPLETO';
    }
    
    onSave({
      ...formData,
      status: finalStatus,
      stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : undefined,
      target_3r: formData.target_3r ? parseFloat(formData.target_3r) : undefined
    });
  };

  const availableReasons = execution.side === 'BUY' 
    ? ['Breakout alcista', 'Rebote soporte', 'Pullback tendencia', 'Momentum trade']
    : ['Take profit', 'Stop loss', 'Trailing stop', 'Breakeven', 'Gestión tiempo'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {execution.side === 'BUY' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="stop_loss">Stop Loss (€)</Label>
            <Input
              id="stop_loss"
              type="number"
              step="0.01"
              value={formData.stop_loss}
              onChange={(e) => handleStopLossChange(e.target.value)}
              placeholder="165.00"
            />
          </div>
          <div>
            <Label htmlFor="target_3r">Target 3R (€)</Label>
            <Input
              id="target_3r"
              type="number"
              step="0.01"
              value={formData.target_3r}
              onChange={(e) => setFormData(prev => ({ ...prev, target_3r: e.target.value }))}
              placeholder="Calculado automáticamente"
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se calcula automáticamente al introducir Stop Loss
            </p>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Notas adicionales..."
        />
      </div>

      {execution.side === 'BUY' && (
        <div>
          <Label htmlFor="entry_reason">Motivo de Entrada</Label>
          <Select value={formData.entry_reason} onValueChange={(value) => setFormData(prev => ({ ...prev, entry_reason: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona motivo..." />
            </SelectTrigger>
            <SelectContent>
              {availableReasons.map(reason => (
                <SelectItem key={reason} value={reason}>{reason}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {execution.side === 'SELL' && (
        <div>
          <Label htmlFor="exit_reason">Motivo de Salida</Label>
          <Select value={formData.exit_reason} onValueChange={(value) => setFormData(prev => ({ ...prev, exit_reason: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona motivo..." />
            </SelectTrigger>
            <SelectContent>
              {availableReasons.map(reason => (
                <SelectItem key={reason} value={reason}>{reason}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          Completar
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}