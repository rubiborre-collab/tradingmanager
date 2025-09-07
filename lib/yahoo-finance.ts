interface YahooFinanceResponse {
  chart: {
    result: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: number[];
        }>;
      };
    }>;
  };
}

export async function fetchSP500Data(period: string = '1y'): Promise<Array<{ date: string; close: number }>> {
  try {
    // Llamar al backend que hace proxy a Yahoo Finance
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/benchmarks/external-prices?period=${period}`;
    
    const response = await fetch(url, {
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'default-api-key'
      }
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const priceData = await response.json();

    return priceData;
  } catch (error) {
    throw error;
  }
}

export async function syncBenchmarkPrices(period: string = '1y'): Promise<number> {
  try {
    // Calcular fechas basadas en el período
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = (() => {
      const date = new Date();
      switch (period) {
        case '1m':
          date.setMonth(date.getMonth() - 1);
          break;
        case '3m':
          date.setMonth(date.getMonth() - 3);
          break;
        case '6m':
          date.setMonth(date.getMonth() - 6);
          break;
        case '1y':
          date.setFullYear(date.getFullYear() - 1);
          break;
        case '2y':
          date.setFullYear(date.getFullYear() - 2);
          break;
        default:
          date.setFullYear(date.getFullYear() - 1);
      }
      return date.toISOString().split('T')[0];
    })();
    
    // Llamar al endpoint de sincronización con rango de fechas
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/benchmarks/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_API_KEY!
      },
      body: JSON.stringify({
        from: fromDate,
        to: toDate
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Backend sync error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();
    return result.total_records || (result.inserted + result.updated) || 0;
  } catch (error) {
    throw error;
  }
}