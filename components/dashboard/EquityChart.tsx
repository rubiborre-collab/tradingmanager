'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush } from 'recharts';
import { formatMoney, formatPct } from '@/lib/date';
import type { DashboardStats } from '@/lib/stats';
interface EquityChartProps {
  stats: DashboardStats;
}

const RANGE_OPTIONS = [
  { key: '1m', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: 'ytd', label: 'YTD' },
  { key: '1y', label: '1Y' },
  { key: 'max', label: 'MAX' }
];

export function EquityChart({ stats }: EquityChartProps) {
  const [selectedRange, setSelectedRange] = useState('ytd');

  const handleRangeChange = (range: string) => {
    setSelectedRange(range);
    // For static site, just update local state
  };

  // Combine data for chart
  const chartData = stats.equityNormalized.map((equity, index) => ({
    date: equity.date,
    equity: equity.value,
    benchmark: stats.benchmarkNormalized[index]?.value || 0,
    equityOriginal: equity.original,
    benchmarkOriginal: stats.benchmarkNormalized[index]?.original || 0,
    // Calcular rentabilidad diaria
    dailyReturn: index > 0 ? 
      ((equity.original - stats.equityNormalized[index - 1].original) / stats.equityNormalized[index - 1].original) * 100 
      : 0
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    const data = payload[0].payload;
    const equityData = payload.find((p: any) => p.dataKey === 'equity');
    const benchmarkData = payload.find((p: any) => p.dataKey === 'benchmark');
    
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-2">
          {formatLabel(label)}
        </p>
        
        {/* Mi Cartera */}
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="font-medium text-gray-700">Mi Cartera</span>
          </div>
          <div className="ml-5 text-sm">
            <p className="text-green-600 font-semibold">
              {formatPct(equityData?.value || 0)} ({formatMoney(data.equityOriginal)})
            </p>
            {data.dailyReturn !== 0 && (
              <p className={`text-xs ${data.dailyReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Rentabilidad diaria: {data.dailyReturn >= 0 ? '+' : ''}{data.dailyReturn.toFixed(2)}%
              </p>
            )}
          </div>
        </div>
        
        {/* S&P 500 */}
        <div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span className="font-medium text-gray-700">S&P 500</span>
          </div>
          <div className="ml-5 text-sm">
            <p className="text-gray-600 font-semibold">
              {formatPct(benchmarkData?.value || 0)} ({formatMoney(data.benchmarkOriginal)})
            </p>
          </div>
        </div>
        
        {/* Diferencia */}
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="text-sm">
            <span className="text-gray-600">Diferencia: </span>
            <span className={`font-semibold ${(equityData?.value || 0) - (benchmarkData?.value || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {((equityData?.value || 0) - (benchmarkData?.value || 0)) >= 0 ? '+' : ''}
              {formatPct((equityData?.value || 0) - (benchmarkData?.value || 0))}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const formatLabel = (label: string) => {
    return new Date(label).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  // Calcular rentabilidades para mostrar en texto
  const carteraReturn = stats.carteraPct;
  const spReturn = stats.spYTDPct;
  const outperformance = carteraReturn - spReturn;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Curva de Equity</CardTitle>
            <CardDescription>
              <div className="flex items-center gap-2">
                <span>Evolución normalizada vs S&P 500 (Capital inicial: €10,000)</span>
                <Badge variant="outline" className="text-xs">
                  Datos reales Yahoo Finance
                </Badge>
              </div>
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {RANGE_OPTIONS.map((option) => (
              <Button
                key={option.key}
                variant={selectedRange === option.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRangeChange(option.key)}
                className="text-xs px-3 py-1"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Performance Comparison */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {formatPct(carteraReturn)}
              </div>
              <p className="text-sm text-gray-600">Mi Cartera</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-600">
                {formatPct(spReturn)}
              </div>
              <p className="text-sm text-gray-600">S&P 500</p>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${outperformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {outperformance >= 0 ? '+' : ''}{formatPct(outperformance)}
              </div>
              <p className="text-sm text-gray-600">Diferencia</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatLabel}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value.toFixed(0)}%`}
              domain={['dataMin - 2', 'dataMax + 2']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="equity" 
              stroke="#16a34a" 
              strokeWidth={3}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="benchmark" 
              stroke="#6b7280" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            <Brush 
              dataKey="date" 
              height={30} 
              stroke="#16a34a"
              tickFormatter={formatLabel}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}