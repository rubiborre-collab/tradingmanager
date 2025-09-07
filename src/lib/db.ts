import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const sql = neon(process.env.DATABASE_URL);

// Test connection function
export async function testConnection() {
  try {
    const result = await sql`SELECT 1 as test`;
    return result[0]?.test === 1;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Create trades table if it doesn't exist
export async function createTradesTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS trades (
        id BIGSERIAL PRIMARY KEY,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
        quantity NUMERIC NOT NULL,
        price NUMERIC NOT NULL,
        commission NUMERIC DEFAULT 0,
        executed_at TIMESTAMPTZ NOT NULL,
        source TEXT,
        source_id TEXT UNIQUE,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    
    // Create index on source_id for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_trades_source_id ON trades(source_id)
    `;
    
    console.log('Trades table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating trades table:', error);
    return false;
  }
}