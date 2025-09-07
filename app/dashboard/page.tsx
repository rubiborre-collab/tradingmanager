'use client';

import { useEffect, useState, useCallback } from 'react';
import { Kpis } from '@/components/dashboard/Kpis';
import { EquityChart } from '@/components/dashboard/EquityChart';
import { TopSymbols } from '@/components/dashboard/TopSymbols';
import { RecentTrades } from '@/components/dashboard/RecentTrades';
import { getDashboardStats, getTopSymbols, getWorstSymbols, getRecentTrades } from '@/lib/stats';
import { syncBenchmarkPrices } from '@/lib/yahoo-finance';
import { getTodayLocal, formatDate } from '@/lib/date';
import type { DashboardStats, TopSymbol, WorstSymbol, RecentTrade } from '@/lib/stats';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topSymbols, setTopSymbols] = useState<TopSymbol[]>([]);
  const [worstSymbols, setWorstSymbols] = useState<WorstSymbol[]>([]);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const today = getTodayLocal();
  const selectedRange = 'ytd'; // Fixed range for static site

  // Escuchar cambios en las ejecuciones para actualizar el dashboard
  useEffect(() => {
    const handleExecutionsUpdate = () => {
      // Re-fetch dashboard data when executions change
      fetchDashboardData();
    };
    
    window.addEventListener('executionsUpdated', handleExecutionsUpdate);
    
    return () => {
      window.removeEventListener('executionsUpdated', handleExecutionsUpdate);
    };
  }, [selectedRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedRange]);

  const fetchDashboardData = useCallback(async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const [dashboardStats, symbols, worstSyms, trades] = await Promise.all([
          getDashboardStats(selectedRange),
          getTopSymbols(),
          getWorstSymbols(),
          getRecentTrades()
        ]);
        
        setStats(dashboardStats);
        setTopSymbols(symbols);
        setWorstSymbols(worstSyms);
        setRecentTrades(trades);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Error al cargar los datos del dashboard');
      } finally {
        setIsLoading(false);
      }
  }, [selectedRange]);

  if (isLoading) {
    return <div>Cargando...</div>; // This will show loading.tsx
  }

  if (error || !stats) {
    throw new Error(error || 'Error al cargar los datos'); // This will show error.tsx
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Resumen · {formatDate(today)}
        </h1>
        <p className="text-gray-500 mt-2">
          Vista general de tu actividad de trading
        </p>
      </div>

      {/* KPIs */}
      <Kpis stats={stats} />

      {/* Equity Chart */}
      <EquityChart stats={stats} />

      {/* Bottom Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopSymbols symbols={topSymbols} worstSymbols={worstSymbols} />
        <RecentTrades trades={recentTrades} />
      </div>
    </div>
  );
}