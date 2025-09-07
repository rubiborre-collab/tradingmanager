import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';

// Validation schema for POST request
const createTradeSchema = z.object({
  symbol: z.string().min(1).max(20),
  side: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive(),
  price: z.number().positive(),
  commission: z.number().min(0).optional().default(0),
  executed_at: z.string().datetime(),
  source: z.string().optional(),
  source_id: z.string().optional(),
  notes: z.string().optional()
});

// Authentication middleware
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.TRADES_API_KEY;
  
  if (!expectedKey) {
    console.error('TRADES_API_KEY environment variable is not set');
    return false;
  }
  
  return apiKey === expectedKey;
}

// POST /api/trades - Create new trade
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validatedData = createTradeSchema.parse(body);
    
    // Check for duplicate source_id if provided
    if (validatedData.source_id) {
      const existingTrade = await sql`
        SELECT id FROM trades WHERE source_id = ${validatedData.source_id}
      `;
      
      if (existingTrade.length > 0) {
        return NextResponse.json(
          { status: 'duplicate', message: 'Trade with this source_id already exists' },
          { status: 409 }
        );
      }
    }

    // Insert new trade
    const result = await sql`
      INSERT INTO trades (
        symbol, side, quantity, price, commission, executed_at, source, source_id, notes
      ) VALUES (
        ${validatedData.symbol},
        ${validatedData.side},
        ${validatedData.quantity},
        ${validatedData.price},
        ${validatedData.commission},
        ${validatedData.executed_at},
        ${validatedData.source || null},
        ${validatedData.source_id || null},
        ${validatedData.notes || null}
      )
      RETURNING id
    `;

    return NextResponse.json(
      { 
        status: 'ok', 
        id: result[0].id,
        message: 'Trade created successfully'
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating trade:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error', 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json(
        { status: 'duplicate', message: 'Trade with this source_id already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/trades - Check if trade exists by source_id
export async function GET(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('source_id');

    if (!sourceId) {
      return NextResponse.json(
        { error: 'source_id parameter is required' },
        { status: 400 }
      );
    }

    // Check if trade exists
    const result = await sql`
      SELECT id FROM trades WHERE source_id = ${sourceId}
    `;

    return NextResponse.json({
      exists: result.length > 0,
      ...(result.length > 0 && { id: result[0].id })
    });

  } catch (error) {
    console.error('Error checking trade existence:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}