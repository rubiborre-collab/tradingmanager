import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for incoming trade data
const createTradeSchema = z.object({
  ticker: z.string().min(1).max(20).transform(val => val.toUpperCase()),
  tipo: z.enum(['COMPRA', 'VENTA', 'BUY', 'SELL']).transform(val => {
    // Normalize to Spanish
    if (val === 'BUY' || val === 'COMPRA') return 'BUY';
    if (val === 'SELL' || val === 'VENTA') return 'SELL';
    return val;
  }),
  cantidad: z.number().positive(),
  precio: z.number().positive(),
  fees: z.number().min(0).optional().default(0.34),
  stop_loss: z.number().positive().optional(),
  target_3r: z.number().positive().optional(),
  fecha_ejecucion: z.string().optional().default(() => new Date().toISOString()),
  motivo_entrada: z.string().optional(),
  motivo_salida: z.string().optional(),
  external_id: z.string().optional(),
  notas: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  broker: z.string().optional()
});

// Authentication middleware
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  
  // Get API key from localStorage simulation (in real app would be from database)
  const expectedKey = process.env.TRADES_API_KEY || 'default-api-key-change-this';
  
  return apiKey === expectedKey;
}

// Function to save trade to localStorage (simulating database)
function saveTradeToStorage(tradeData: any) {
  // In a real implementation, this would save to database
  // For now, we'll return a success response with the trade data
  
  const trade = {
    id: Date.now().toString(),
    ticker: tradeData.ticker,
    tipo: tradeData.tipo,
    cantidad: tradeData.cantidad,
    precio: tradeData.precio,
    fees: tradeData.fees,
    stop_loss: tradeData.stop_loss,
    target_3r: tradeData.target_3r,
    fecha_ejecucion: tradeData.fecha_ejecucion,
    motivo_entrada: tradeData.motivo_entrada,
    motivo_salida: tradeData.motivo_salida,
    external_id: tradeData.external_id,
    notas: tradeData.notas,
    tags: tradeData.tags,
    broker: tradeData.broker,
    valor_total: tradeData.cantidad * tradeData.precio,
    resultado_r: null, // Will be calculated when position is closed
    pnl_euros: null, // Will be calculated when position is closed
    status: 'ABIERTA',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return trade;
}

// POST /api/new-trade - Create new trade from external automation
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid or missing API key',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validatedData = createTradeSchema.parse(body);
    
    // Check for duplicate external_id if provided
    if (validatedData.external_id) {
      // In real app, check database for existing external_id
      // For now, we'll simulate this check
      console.log(`Checking for duplicate external_id: ${validatedData.external_id}`);
    }

    // Calculate additional fields
    const enrichedData = {
      ...validatedData,
      valor_total: validatedData.cantidad * validatedData.precio,
      // Auto-calculate target 3R if stop_loss is provided
      target_3r: validatedData.target_3r || (
        validatedData.stop_loss && validatedData.tipo === 'BUY' 
          ? validatedData.precio + (3 * Math.abs(validatedData.precio - validatedData.stop_loss))
          : undefined
      )
    };

    // Save trade (in real app, this would be database operation)
    const savedTrade = saveTradeToStorage(enrichedData);

    // Convert to execution format for frontend compatibility
    const execution = {
      id: savedTrade.id,
      symbol: savedTrade.ticker,
      side: savedTrade.tipo,
      quantity: savedTrade.cantidad,
      price: savedTrade.precio,
      fee: savedTrade.fees,
      executed_at: savedTrade.fecha_ejecucion,
      notes: savedTrade.notas,
      entry_reason: savedTrade.motivo_entrada,
      exit_reason: savedTrade.motivo_salida,
      external_id: savedTrade.external_id,
      tags: savedTrade.tags,
      stop_loss: savedTrade.stop_loss,
      target_3r: savedTrade.target_3r,
      status: (savedTrade.tipo === 'BUY' && !savedTrade.motivo_entrada) || 
              (savedTrade.tipo === 'SELL' && !savedTrade.motivo_salida) 
              ? 'INCOMPLETO' : 'COMPLETO',
      created_at: savedTrade.created_at,
      updated_at: savedTrade.updated_at
    };

    // Add to localStorage for frontend integration
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('trading_executions') || '[]';
      const executions = JSON.parse(stored);
      executions.unshift(execution);
      localStorage.setItem('trading_executions', JSON.stringify(executions));
      
      // Trigger update event
      window.dispatchEvent(new CustomEvent('executionsUpdated'));
    }

    return NextResponse.json({
      success: true,
      message: 'Trade created successfully',
      data: {
        id: savedTrade.id,
        ticker: savedTrade.ticker,
        tipo: savedTrade.tipo,
        cantidad: savedTrade.cantidad,
        precio: savedTrade.precio,
        valor_total: savedTrade.valor_total,
        status: execution.status,
        external_id: savedTrade.external_id,
        created_at: savedTrade.created_at
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating trade:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors,
        code: 'VALIDATION_ERROR'
      }, { status: 400 });
    }

    // Check for duplicate external_id
    if (error instanceof Error && error.message.includes('duplicate')) {
      return NextResponse.json({
        success: false,
        error: 'Trade with this external_id already exists',
        code: 'DUPLICATE_TRADE'
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

// GET /api/new-trade - Get API documentation
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/new-trade',
    method: 'POST',
    description: 'Create new trade from external automation (n8n, webhooks, etc.)',
    authentication: 'x-api-key header required',
    required_fields: ['ticker', 'tipo', 'cantidad', 'precio'],
    optional_fields: ['fees', 'stop_loss', 'target_3r', 'fecha_ejecucion', 'motivo_entrada', 'motivo_salida', 'external_id', 'notas', 'tags', 'broker'],
    example_request: {
      ticker: 'AAPL',
      tipo: 'COMPRA',
      cantidad: 100,
      precio: 175.50,
      stop_loss: 165.00,
      motivo_entrada: 'Breakout alcista',
      external_id: 'N8N_12345',
      notas: 'Desde n8n automático'
    },
    example_response: {
      success: true,
      message: 'Trade created successfully',
      data: {
        id: '1642248600000',
        ticker: 'AAPL',
        tipo: 'COMPRA',
        valor_total: 17550.00,
        status: 'COMPLETO'
      }
    }
  });
}