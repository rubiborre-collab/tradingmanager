import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for query parameters
const getTradesSchema = z.object({
  ticker: z.string().optional(),
  tipo: z.enum(['COMPRA', 'VENTA', 'BUY', 'SELL']).optional(),
  fecha_desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fecha_hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['ABIERTA', 'CERRADA', 'COMPLETO', 'INCOMPLETO']).optional(),
  external_id: z.string().optional(),
  broker: z.string().optional(),
  limit: z.string().transform(val => parseInt(val)).optional().default(100),
  offset: z.string().transform(val => parseInt(val)).optional().default(0)
});

// Authentication middleware
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.TRADES_API_KEY || 'default-api-key-change-this';
  return apiKey === expectedKey;
}

// Function to get trades from storage (simulating database)
function getTradesFromStorage(filters: any) {
  // In real implementation, this would query the database
  // For now, return empty array as placeholder
  
  const mockTrades = [
    {
      id: '1',
      ticker: 'AAPL',
      tipo: 'COMPRA',
      cantidad: 100,
      precio: 175.50,
      fees: 0.34,
      valor_total: 17550.00,
      fecha_ejecucion: '2024-05-15T10:30:00Z',
      motivo_entrada: 'Breakout alcista',
      external_id: 'N8N_12345',
      notas: 'Desde n8n automático',
      tags: ['automatico', 'n8n'],
      broker: 'ib',
      status: 'COMPLETO',
      resultado_r: null,
      pnl_euros: null,
      created_at: '2024-05-15T10:30:00Z',
      updated_at: '2024-05-15T10:30:00Z'
    }
  ];

  // Apply filters
  let filteredTrades = mockTrades;

  if (filters.ticker) {
    filteredTrades = filteredTrades.filter(trade => 
      trade.ticker.toLowerCase().includes(filters.ticker.toLowerCase())
    );
  }

  if (filters.tipo) {
    const normalizedTipo = filters.tipo === 'BUY' ? 'COMPRA' : filters.tipo === 'SELL' ? 'VENTA' : filters.tipo;
    filteredTrades = filteredTrades.filter(trade => trade.tipo === normalizedTipo);
  }

  if (filters.fecha_desde) {
    filteredTrades = filteredTrades.filter(trade => 
      new Date(trade.fecha_ejecucion) >= new Date(filters.fecha_desde)
    );
  }

  if (filters.fecha_hasta) {
    filteredTrades = filteredTrades.filter(trade => 
      new Date(trade.fecha_ejecucion) <= new Date(filters.fecha_hasta)
    );
  }

  if (filters.status) {
    filteredTrades = filteredTrades.filter(trade => trade.status === filters.status);
  }

  if (filters.external_id) {
    filteredTrades = filteredTrades.filter(trade => trade.external_id === filters.external_id);
  }

  if (filters.broker) {
    filteredTrades = filteredTrades.filter(trade => trade.broker === filters.broker);
  }

  // Apply pagination
  const total = filteredTrades.length;
  const paginatedTrades = filteredTrades.slice(filters.offset, filters.offset + filters.limit);

  return {
    trades: paginatedTrades,
    pagination: {
      total,
      limit: filters.limit,
      offset: filters.offset,
      has_more: filters.offset + filters.limit < total
    }
  };
}

// GET /api/get-trades - Get trades with optional filters
export async function GET(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or missing API key',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validatedFilters = getTradesSchema.parse(queryParams);

    // Get trades from storage/database
    const result = getTradesFromStorage(validatedFilters);

    // Calculate summary statistics
    const stats = {
      total_trades: result.pagination.total,
      total_volume: result.trades.reduce((sum, trade) => sum + trade.valor_total, 0),
      avg_trade_size: result.trades.length > 0 
        ? result.trades.reduce((sum, trade) => sum + trade.valor_total, 0) / result.trades.length 
        : 0,
      symbols_count: new Set(result.trades.map(trade => trade.ticker)).size,
      buy_trades: result.trades.filter(trade => trade.tipo === 'COMPRA').length,
      sell_trades: result.trades.filter(trade => trade.tipo === 'VENTA').length,
      brokers: [...new Set(result.trades.map(trade => trade.broker).filter(Boolean))]
    };

    return NextResponse.json({
      success: true,
      message: 'Trades retrieved successfully',
      data: {
        trades: result.trades,
        pagination: result.pagination,
        stats,
        filters_applied: validatedFilters
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting trades:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors,
        code: 'VALIDATION_ERROR'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

// POST /api/get-trades - Bulk operations or complex queries
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or missing API key'
      }, { status: 401 });
    }

    const body = await request.json();
    
    // Support for complex queries via POST body
    const querySchema = z.object({
      filters: z.object({
        tickers: z.array(z.string()).optional(),
        tipos: z.array(z.enum(['COMPRA', 'VENTA'])).optional(),
        fecha_desde: z.string().optional(),
        fecha_hasta: z.string().optional(),
        min_cantidad: z.number().optional(),
        max_cantidad: z.number().optional(),
        min_precio: z.number().optional(),
        max_precio: z.number().optional(),
        brokers: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional()
      }).optional(),
      aggregations: z.object({
        group_by: z.enum(['ticker', 'tipo', 'broker', 'month', 'day']).optional(),
        metrics: z.array(z.enum(['count', 'sum_volume', 'avg_price', 'total_fees'])).optional()
      }).optional(),
      limit: z.number().max(1000).optional().default(100),
      offset: z.number().optional().default(0)
    });

    const validatedQuery = querySchema.parse(body);

    // Process complex query (simplified for demo)
    const result = getTradesFromStorage(validatedQuery.filters || {});

    return NextResponse.json({
      success: true,
      data: result,
      query: validatedQuery
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}