import { KpisSkeleton } from '@/components/dashboard/Kpis.Skeleton';
import { TopSymbolsSkeleton } from '@/components/dashboard/TopSymbols';
import { RecentTradesSkeleton } from '@/components/dashboard/RecentTrades';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* KPIs */}
      <KpisSkeleton />

      {/* Equity Chart */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-12" />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>

      {/* Bottom Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopSymbolsSkeleton />
        <RecentTradesSkeleton />
      </div>
    </div>
  );
}