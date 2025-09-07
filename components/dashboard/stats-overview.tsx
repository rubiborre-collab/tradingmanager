'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface StatsOverviewProps {
  stats: {
    top_symbols: Array<{
      symbol: string;
      pnl: number;
      trades: number;
    }>;
  };
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Top Símbolos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.top_symbols.slice(0, 5).map((item, index) => (
            <div key={item.symbol} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="text-xs">
                    #{index + 1}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium text-sm">{item.symbol}</p>
                  <p className="text-xs text-gray-500">{item.trades} operaciones</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-medium text-sm ${item.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(item.pnl)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}