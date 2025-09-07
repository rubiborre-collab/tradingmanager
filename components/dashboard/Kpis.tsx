'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Target } from 'lucide-react';
import { formatMoney, formatPct } from '@/lib/date';
import type { DashboardStats } from '@/lib/stats';

interface KpisProps {
  stats: DashboardStats;
}

export function Kpis({ stats }: KpisProps) {
  const equityYTDPct = ((stats.equityNow - 10000) / 10000) * 100;
  const spComparison = equityYTDPct - stats.spYTDPct;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {/* Equity Total */}
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-700">Equity Total</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatMoney(stats.equityNow)}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-xs text-green-600">
              <span className="font-semibold">{formatPct(equityYTDPct)}</span> YTD
            </p>
            <Badge 
              variant={spComparison >= 0 ? 'default' : 'destructive'}
              className={`text-xs ${spComparison >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
            >
              {spComparison >= 0 ? '+' : ''}{formatPct(spComparison)} vs S&P 500
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* PnL Realizado + No Realizado */}
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-700">PnL Realizado</CardTitle>
          {stats.pnlRealizedYTD >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats.pnlRealizedYTD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatMoney(stats.pnlRealizedYTD)}
          </div>
          <p className="text-xs text-green-600 mt-2">
            Solo operaciones cerradas
          </p>
        </CardContent>
      </Card>

      {/* Profit Factor */}
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-700">Profit Factor</CardTitle>
          <Activity className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {stats.profitFactor.toFixed(2)}
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Ganancia bruta / Pérdida bruta
          </p>
        </CardContent>
      </Card>

      {/* Expectancy */}
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-indigo-700">Expectancy</CardTitle>
          <TrendingUp className="h-4 w-4 text-indigo-600" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats.expectancy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatMoney(stats.expectancy)}
          </div>
          <p className="text-xs text-indigo-600 mt-2">
            Ganancia esperada por trade
          </p>
        </CardContent>
      </Card>
      {/* Win Rate */}
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-purple-700">Win Rate</CardTitle>
          <Target className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">
            {formatPct(stats.winRate)}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-xs text-purple-600">
              <span className="font-semibold">{stats.numTrades}</span> trades
            </p>
            <Badge variant="outline" className="text-xs border-purple-200 text-purple-700">
              Payoff: {stats.payoff.toFixed(2)}x
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Max Drawdown */}
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-red-700">Max Drawdown</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatMoney(stats.maxDDAbs)}
          </div>
          <p className="text-xs text-red-600 mt-2">
            <span className="font-semibold">{formatPct(stats.maxDDPct)}</span> pérdida máxima
          </p>
        </CardContent>
      </Card>
    </div>
  );
}