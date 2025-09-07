-- Trading App Database Schema

-- Settings table (single row)
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  starting_cash DECIMAL(15,2) NOT NULL DEFAULT 10000.00,
  default_fee DECIMAL(10,4) NOT NULL DEFAULT 0.34,
  risk_pct DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  entry_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
  exit_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
  timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Madrid',
  benchmark_source VARCHAR(100) DEFAULT 'S&P 500',
  api_key VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (api_key) 
SELECT 'default-api-key-change-this'
WHERE NOT EXISTS (SELECT 1 FROM settings);

-- Positions table
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  open_quantity DECIMAL(15,8) NOT NULL DEFAULT 0,
  avg_cost DECIMAL(15,8) NOT NULL DEFAULT 0,
  realized_pnl DECIMAL(15,2) NOT NULL DEFAULT 0,
  unrealized_pnl DECIMAL(15,2) NOT NULL DEFAULT 0,
  max_drawdown DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);
CREATE INDEX IF NOT EXISTS idx_positions_created_at ON positions(created_at);

-- Executions table
CREATE TABLE IF NOT EXISTS executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(4) NOT NULL CHECK (side IN ('BUY', 'SELL')),
  quantity DECIMAL(15,8) NOT NULL CHECK (quantity > 0),
  price DECIMAL(15,8) NOT NULL CHECK (price > 0),
  fee DECIMAL(10,4) NOT NULL DEFAULT 0.34,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  entry_reason VARCHAR(255),
  exit_reason VARCHAR(255),
  external_id VARCHAR(255) UNIQUE,
  position_id UUID NOT NULL REFERENCES positions(id),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETO' CHECK (status IN ('INCOMPLETO', 'COMPLETO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_executions_symbol ON executions(symbol);
CREATE INDEX IF NOT EXISTS idx_executions_side ON executions(side);
CREATE INDEX IF NOT EXISTS idx_executions_executed_at ON executions(executed_at);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_position_id ON executions(position_id);
CREATE INDEX IF NOT EXISTS idx_executions_external_id ON executions(external_id);

-- Buy lots for FIFO matching
CREATE TABLE IF NOT EXISTS buy_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES positions(id),
  execution_id UUID NOT NULL REFERENCES executions(id),
  qty_remaining DECIMAL(15,8) NOT NULL CHECK (qty_remaining >= 0),
  price DECIMAL(15,8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buy_lots_position_id ON buy_lots(position_id);
CREATE INDEX IF NOT EXISTS idx_buy_lots_execution_id ON buy_lots(execution_id);
CREATE INDEX IF NOT EXISTS idx_buy_lots_created_at ON buy_lots(created_at);

-- Lot matches for FIFO tracking
CREATE TABLE IF NOT EXISTS lot_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sell_execution_id UUID NOT NULL REFERENCES executions(id),
  buy_lot_id UUID NOT NULL REFERENCES buy_lots(id),
  quantity DECIMAL(15,8) NOT NULL CHECK (quantity > 0),
  realized_pnl DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lot_matches_sell_execution ON lot_matches(sell_execution_id);
CREATE INDEX IF NOT EXISTS idx_lot_matches_buy_lot ON lot_matches(buy_lot_id);

-- Cash flows
CREATE TABLE IF NOT EXISTS cash_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_flows_date ON cash_flows(date);
CREATE INDEX IF NOT EXISTS idx_cash_flows_type ON cash_flows(type);

-- Benchmark prices (daily closes)
CREATE TABLE IF NOT EXISTS benchmark_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  close DECIMAL(15,4) NOT NULL CHECK (close > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_benchmark_prices_date ON benchmark_prices(date);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_executions_updated_at
  BEFORE UPDATE ON executions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();