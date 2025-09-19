import { NextRequest, NextResponse } from 'next/server';

// Authentication middleware
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.TRADES_API_KEY || 'default-api-key-change-this';
  return apiKey === expectedKey;
}

// GET /api/trades-status - System status and API information
export async function GET(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or missing API key'
      }, { status: 401 });
    }

    // Get system status
    const status = {
      system: {
        status: 'operational',
        timestamp: new Date().toISOString(),
        timezone: 'Europe/Madrid',
        version: '1.0.0'
      },
      database: {
        status: 'connected',
        type: 'localStorage', // In real app would be PostgreSQL/Supabase
        last_backup: new Date().toISOString()
      },
      api: {
        endpoints: [
          {
            path: '/api/new-trade',
            method: 'POST',
            description: 'Create new trade from automation',
            rate_limit: 'None',
            auth_required: true
          },
          {
            path: '/api/get-trades',
            method: 'GET',
            description: 'Get trades with filters',
            rate_limit: 'None',
            auth_required: true
          },
          {
            path: '/api/trades-status',
            method: 'GET',
            description: 'System status and health check',
            rate_limit: 'None',
            auth_required: true
          }
        ]
      },
      integration: {
        n8n_compatible: true,
        webhook_support: true,
        bulk_operations: true,
        real_time_updates: true
      },
      stats: {
        // In real app, get from database
        total_trades_today: 0,
        total_api_calls_today: 0,
        last_trade_created: null,
        uptime: '100%'
      }
    };

    return NextResponse.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Error getting system status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      system_status: 'error'
    }, { status: 500 });
  }
}