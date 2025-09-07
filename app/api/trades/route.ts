import { NextRequest, NextResponse } from 'next/server';

// Simulación de almacenamiento (en producción usarías una base de datos)
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'default-api-key-change-this';

interface TradeData {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  fee?: number;
  executed_at?: string;
  notes?: string;
  entry_reason?: string;
  exit_reason?: string;
  external_id?: string;
  tags?: string[];
}

// Función para validar API Key
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  return apiKey === API_KEY;
}

// Función para guardar en localStorage (simulación)
function saveTrade(trade: TradeData) {
  // En el frontend, esto se haría con localStorage
  // Aquí simulamos la estructura que espera la aplicación
  const execution = {
    id: Date.now().toString(),
    symbol: trade.symbol,
    side: trade.side,
    quantity: trade.quantity,
    price: trade.price,
    fee: trade.fee || 0.34,
    executed_at: trade.executed_at || new Date().toISOString(),
    notes: trade.notes,
    entry_reason: trade.entry_reason,
    exit_reason: trade.exit_reason,
    external_id: trade.external_id,
    tags: trade.tags || [],
    status: (trade.side === 'BUY' && !trade.entry_reason) || 
            (trade.side === 'SELL' && !trade.exit_reason) 
            ? 'INCOMPLETO' : 'COMPLETO',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  return execution;
}

// POST /api/trades - Crear nueva operación
export async function POST(request: NextRequest) {
  try {
    // Validar API Key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validar campos requeridos
    if (!body.symbol || !body.side || !body.quantity || !body.price) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['symbol', 'side', 'quantity', 'price']
        },
        { status: 400 }
      );
    }

    // Validar valores
    if (body.quantity <= 0 || body.price <= 0) {
      return NextResponse.json(
        { error: 'Quantity and price must be positive numbers' },
        { status: 400 }
      );
    }

    if (!['BUY', 'SELL'].includes(body.side)) {
      return NextResponse.json(
        { error: 'Side must be either BUY or SELL' },
        { status: 400 }
      );
    }

    // Crear la operación
    const trade: TradeData = {
      symbol: body.symbol.toUpperCase(),
      side: body.side,
      quantity: parseFloat(body.quantity),
      price: parseFloat(body.price),
      fee: body.fee ? parseFloat(body.fee) : 0.34,
      executed_at: body.executed_at || new Date().toISOString(),
      notes: body.notes,
      entry_reason: body.entry_reason,
      exit_reason: body.exit_reason,
      external_id: body.external_id,
      tags: body.tags
    };

    const savedTrade = saveTrade(trade);

    return NextResponse.json({
      success: true,
      message: 'Trade created successfully',
      data: savedTrade
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating trade:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/trades - Obtener operaciones
export async function GET(request: NextRequest) {
  try {
    // Validar API Key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    // En una implementación real, aquí consultarías la base de datos
    return NextResponse.json({
      success: true,
      message: 'This endpoint would return stored trades from database',
      data: []
    });

  } catch (error) {
    console.error('Error getting trades:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}