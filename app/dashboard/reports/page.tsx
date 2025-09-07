'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, Code, Calendar } from 'lucide-react';
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface ReportData {
  period: string;
  totalTrades: number;
  winrate: number;
  totalPnL: number;
  bestTrade: number;
  worstTrade: number;
  avgTrade: number;
  sharpe: number;
  maxDrawdown: number;
  topSymbols: Array<{
    symbol: string;
    pnl: number;
    trades: number;
  }>;
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('monthly');
  const [selectedPeriod, setSelectedPeriod] = useState('2024-05');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Start with empty report data
    const emptyReportData: ReportData = {
      period: selectedPeriod,
      totalTrades: 0,
      winrate: 0,
      totalPnL: 0,
      bestTrade: 0,
      worstTrade: 0,
      avgTrade: 0,
      sharpe: 0,
      maxDrawdown: 0,
      topSymbols: []
    };

    setReportData(emptyReportData);
  }, [selectedPeriod]);

  const generateReport = async () => {
    setIsGenerating(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Informe generado correctamente');
    } catch (error) {
      toast.error('Error al generar el informe');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    try {
      import('jspdf').then(({ default: jsPDF }) => {
        import('jspdf-autotable').then(() => {
          const doc = new jsPDF();
        
          // Título del documento
          doc.setFontSize(20);
          doc.text('Informe de Trading', 20, 20);
        
          // Información del período
          doc.setFontSize(12);
          doc.text(`Período: ${reportData?.period}`, 20, 35);
        
          // Métricas principales
          const metrics = [
            ['Total Operaciones', reportData?.totalTrades.toString() || '0'],
            ['Winrate', formatPercent(reportData?.winrate || 0)],
            ['PnL Total', formatCurrency(reportData?.totalPnL || 0)],
            ['Ratio Sharpe', reportData?.sharpe?.toFixed(2) || '0'],
            ['Mejor Operación', formatCurrency(reportData?.bestTrade || 0)],
            ['Peor Operación', formatCurrency(reportData?.worstTrade || 0)],
            ['Promedio por Operación', formatCurrency(reportData?.avgTrade || 0)],
            ['Drawdown Máximo', formatCurrency(reportData?.maxDrawdown || 0)]
          ];
        
          (doc as any).autoTable({
            head: [['Métrica', 'Valor']],
            body: metrics,
            startY: 50,
            theme: 'striped'
          });
        
          // Top símbolos
          if (reportData?.topSymbols) {
            const symbolsData = reportData.topSymbols.map((symbol, index) => [
              `#${index + 1}`,
              symbol.symbol,
              symbol.trades.toString(),
              formatCurrency(symbol.pnl)
            ]);
          
            (doc as any).autoTable({
              head: [['Ranking', 'Símbolo', 'Operaciones', 'PnL']],
              body: symbolsData,
              startY: (doc as any).lastAutoTable.finalY + 20,
              theme: 'striped'
            });
          }
        
          // Generar nombre del archivo
          const fileName = `informe-trading-${selectedPeriod}.pdf`;
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

  const copyApiCall = (endpoint: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const apiCall = `curl -H "x-api-key: YOUR_API_KEY" "${apiUrl}${endpoint}"`;
    navigator.clipboard.writeText(apiCall);
    toast.success('Comando API copiado al portapapeles');
  };

  const apiEndpoints = [
    {
      name: 'Resumen General',
      endpoint: '/stats/overview',
      description: 'Estadísticas generales de trading'
    },
    {
      name: 'PnL Diario',
      endpoint: '/stats/daily?from=2024-05-01&to=2024-05-31',
      description: 'PnL realizado por día'
    },
    {
      name: 'Estadísticas de Setups',
      endpoint: '/stats/setups?from=2024-05-01&to=2024-05-31',
      description: 'Performance por estrategia'
    },
    {
      name: 'Ejecuciones',
      endpoint: '/executions?from=2024-05-01&to=2024-05-31',
      description: 'Lista de todas las ejecuciones'
    },
    {
      name: 'Posiciones',
      endpoint: '/positions',
      description: 'Estado de todas las posiciones'
    }
  ];

  if (!reportData) {
    return <div className="p-6">Cargando datos del informe...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Informes</h1>
        <p className="text-gray-500 mt-2">
          Genera informes detallados y accede a las URLs de API para automatización
        </p>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">Generar Informes</TabsTrigger>
          <TabsTrigger value="api">URLs de API</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          {/* Report Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Configuración del Informe
              </CardTitle>
              <CardDescription>
                Selecciona el período y tipo de informe que deseas generar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="reportType">Tipo de Informe</Label>
                  <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="period">Período</Label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024-05">Mayo 2024</SelectItem>
                      <SelectItem value="2024-04">Abril 2024</SelectItem>
                      <SelectItem value="2024-03">Marzo 2024</SelectItem>
                      <SelectItem value="2024-02">Febrero 2024</SelectItem>
                      <SelectItem value="2024-01">Enero 2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={generateReport} 
                    disabled={isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? 'Generando...' : 'Generar Informe'}
                  </Button>
                </div>
              </div>

              <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium mb-2">Período Personalizado</h4>
                <div className="grid gap-2 md:grid-cols-3">
                  <div>
                    <Label htmlFor="from">Desde</Label>
                    <Input
                      id="from"
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="to">Hasta</Label>
                    <Input
                      id="to"
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" className="w-full">
                      Generar Personalizado
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Preview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Vista Previa - {reportData.period}</CardTitle>
                <CardDescription>
                  Resumen ejecutivo del período seleccionado
                </CardDescription>
              </div>
              <Button onClick={downloadPDF} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
            </CardHeader>
            <CardContent>
              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{reportData.totalTrades}</div>
                  <p className="text-sm text-gray-500">Total Operaciones</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatPercent(reportData.winrate)}
                  </div>
                  <p className="text-sm text-gray-500">Winrate</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className={`text-2xl font-bold ${reportData.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(reportData.totalPnL)}
                  </div>
                  <p className="text-sm text-gray-500">PnL Total</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {reportData.sharpe.toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-500">Ratio Sharpe</p>
                </div>
              </div>

              {/* Performance Details */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-3">Estadísticas de Performance</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mejor Operación:</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(reportData.bestTrade)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Peor Operación:</span>
                      <span className="font-medium text-red-600">
                        {formatCurrency(reportData.worstTrade)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Promedio por Operación:</span>
                      <span className="font-medium">
                        {formatCurrency(reportData.avgTrade)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Drawdown Máximo:</span>
                      <span className="font-medium text-red-600">
                        {formatCurrency(reportData.maxDrawdown)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Top Símbolos</h4>
                  <div className="space-y-3">
                    {reportData.topSymbols.map((symbol, index) => (
                      <div key={symbol.symbol} className="flex justify-between items-center p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <span className="font-medium">{symbol.symbol}</span>
                          <span className="text-sm text-gray-500">
                            ({symbol.trades} ops)
                          </span>
                        </div>
                        <span className={`font-medium ${symbol.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(symbol.pnl)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                URLs de API para Automatización
              </CardTitle>
              <CardDescription>
                Endpoints disponibles para integrar con n8n, IBKR u otros sistemas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiEndpoints.map((endpoint, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{endpoint.name}</h4>
                        <p className="text-sm text-gray-500">{endpoint.description}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyApiCall(endpoint.endpoint)}
                      >
                        Copiar cURL
                      </Button>
                    </div>
                    <div className="bg-gray-100 p-3 rounded font-mono text-sm">
                      GET {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}{endpoint.endpoint}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">Autenticación</h4>
                <p className="text-sm text-yellow-700">
                  Todos los endpoints requieren el header <code className="bg-yellow-100 px-1 rounded">x-api-key</code> 
                  con tu clave API. Puedes gestionar tu API key desde la página de configuración.
                </p>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Ejemplo de Uso con n8n</h4>
                <p className="text-sm text-blue-700 mb-2">
                  Puedes usar estos endpoints en n8n para crear workflows automatizados:
                </p>
                <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                  <li>Generar informes automáticos semanales/mensuales</li>
                  <li>Enviar alertas cuando el drawdown supere un umbral</li>
                  <li>Sincronizar operaciones desde Interactive Brokers</li>
                  <li>Crear backups automáticos de datos</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}