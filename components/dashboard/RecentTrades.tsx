'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatMoney, formatDatetime } from '@/lib/date';
import type { RecentTrade } from '@/lib/stats';
import Link from 'next/link';

interface RecentTradesProps {
  trades: RecentTrade[];
}

export function RecentTrades({ trades }: RecentTradesProps) {
  const [filters, setFilters] = useState({
    ticker: '',
    dateFrom: '',
    dateTo: ''
  });

  // Filtrar trades
  const filteredTrades = trades.filter(trade => {
    const matchesTicker = !filters.ticker || 
      trade.ticker.toLowerCase().includes(filters.ticker.toLowerCase());
    
    const matchesDateFrom = !filters.dateFrom || 
      trade.date >= new Date(filters.dateFrom);
    
    const matchesDateTo = !filters.dateTo || 
      trade.date <= new Date(filters.dateTo);
    
    return matchesTicker && matchesDateFrom && matchesDateTo;
  });

  if (trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Operaciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>No hay operaciones recientes</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Operaciones Recientes</CardTitle>
        
        {/* Filtros */}
        <div className="grid gap-3 md:grid-cols-3 mt-4">
          <div>
            <Label htmlFor="ticker-filter" className="text-xs">Ticker</Label>
            <Input
              id="ticker-filter"
              placeholder="AAPL, TSLA..."
              value={filters.ticker}
              onChange={(e) => setFilters(prev => ({ ...prev, ticker: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="date-from" className="text-xs">Desde</Label>
            <Input
              id="date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="date-to" className="text-xs">Hasta</Label>
            <Input
              id="date-to"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filteredTrades.map((trade) => (
            <Link
              key={trade.id}
              href="/dashboard/blotter"
              className="block hover:bg-gray-50 rounded-lg p-3 -m-3 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={`Ver operaciones en blotter`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="text-lg font-bold text-gray-900">
                      {trade.ticker}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant={trade.side === 'BUY' ? 'default' : 'secondary'}
                        className={`text-xs font-semibold ${
                          trade.side === 'BUY' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {trade.side}
                      </Badge>
                      <Badge 
                        variant={trade.status === 'COMPLETO' ? 'default' : 'destructive'}
                        className={`text-xs ${
                          trade.status === 'COMPLETO' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {trade.status}
                      </Badge>
                      {trade.tags && trade.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">
                      {trade.quantity} @ {formatMoney(trade.price)} — {formatDatetime(trade.date)}
                    </p>
                    {trade.notes && (
                      <p className="text-xs text-gray-500 mt-1 italic">
                        {trade.notes}
                      </p>
                    )}
                  </div>
                </div>
                {trade.pnl !== undefined && (
                  <div className="text-right flex-shrink-0 flex items-center gap-1">
                    {trade.pnl >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`font-semibold ${
                      trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatMoney(trade.pnl)}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
        
        {filteredTrades.length === 0 && trades.length > 0 && (
          <div className="text-center py-4 text-gray-500">
            <p>No hay operaciones que coincidan con los filtros</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentTradesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Operaciones Recientes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-6 bg-gray-200 rounded animate-pulse" />
                <div>
                  <div className="flex gap-2 mb-1">
                    <div className="w-12 h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="w-32 h-3 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}