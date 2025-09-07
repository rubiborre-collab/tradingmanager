'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatMoney, formatPct } from '@/lib/date';
import type { TopSymbol, WorstSymbol } from '@/lib/stats';
import Link from 'next/link';

interface TopSymbolsProps {
  symbols: TopSymbol[];
  worstSymbols: WorstSymbol[];
}

export function TopSymbols({ symbols, worstSymbols }: TopSymbolsProps) {
  if (symbols.length === 0 && worstSymbols.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Análisis de Símbolos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>No hay datos de símbolos disponibles</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxAbsPnL = Math.max(
    ...symbols.map(s => Math.abs(s.pnlAbs)),
    ...worstSymbols.map(s => Math.abs(s.pnlAbs))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Análisis de Símbolos</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Top Performers */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Mejores Símbolos
          </h4>
          <div className="space-y-3">
            {symbols.slice(0, 4).map((symbol, index) => {
              const barWidth = (Math.abs(symbol.pnlAbs) / maxAbsPnL) * 100;
              const isPositive = symbol.pnlAbs >= 0;
              
              return (
                <Link 
                  key={symbol.ticker} 
                  href={`/dashboard/blotter?symbol=${symbol.ticker}`}
                  className="block hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label={`Ver operaciones de ${symbol.ticker}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Badge variant="outline" className="text-xs font-mono bg-green-50 text-green-700 border-green-200">
                          #{index + 1}
                        </Badge>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-gray-900">{symbol.ticker}</p>
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                            {symbol.opsCount} ops
                          </Badge>
                          <Badge variant="outline" className="text-xs border-green-200 text-green-700">
                            {formatPct(symbol.winRate)} WR
                          </Badge>
                        </div>
                        <div className="mt-1 relative">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-300 bg-green-500"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-sm text-green-600">
                        {formatMoney(symbol.pnlAbs)}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span>{formatPct(symbol.pnlPct)}</span>
                        <span>•</span>
                        <span>{formatMoney(symbol.avgReturn)} avg</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Worst Performers */}
        <div>
          <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            Símbolos con Mayores Pérdidas
          </h4>
          <div className="space-y-3">
            {worstSymbols.slice(0, 4).map((symbol, index) => {
              const barWidth = (Math.abs(symbol.pnlAbs) / maxAbsPnL) * 100;
              
              return (
                <Link 
                  key={symbol.ticker} 
                  href={`/dashboard/blotter?symbol=${symbol.ticker}`}
                  className="block hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label={`Ver operaciones de ${symbol.ticker}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Badge variant="outline" className="text-xs font-mono bg-red-50 text-red-700 border-red-200">
                          #{index + 1}
                        </Badge>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-gray-900">{symbol.ticker}</p>
                          <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                            {symbol.opsCount} ops
                          </Badge>
                          <Badge variant="outline" className="text-xs border-red-200 text-red-700">
                            {formatPct(symbol.winRate)} WR
                          </Badge>
                        </div>
                        <div className="mt-1 relative">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-300 bg-red-500"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-sm text-red-600">
                        {formatMoney(symbol.pnlAbs)}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span>{formatPct(symbol.pnlPct)}</span>
                        <span>•</span>
                        <span>{formatMoney(symbol.avgReturn)} avg</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TopSymbolsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Análisis de Símbolos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-6 bg-gray-200 rounded animate-pulse" />
                <div>
                  <div className="w-12 h-4 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="w-24 h-2 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="text-right">
                <div className="w-16 h-4 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="w-12 h-3 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}