export enum ExecutionSide {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum ExecutionStatus {
  INCOMPLETO = 'INCOMPLETO',
  COMPLETO = 'COMPLETO'
}

export enum CashFlowType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL'
}

export interface Execution {
  id: string;
  symbol: string;
  side: ExecutionSide;
  quantity: number;
  price: number;
  fee: number;
  executed_at: Date;
  notes?: string;
  entry_reason?: string;
  exit_reason?: string;
  external_id?: string;
  position_id: string;
  tags?: string[];
  status: ExecutionStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Position {
  id: string;
  symbol: string;
  open_quantity: number;
  avg_cost: number;
  realized_pnl: number;
  unrealized_pnl: number;
  max_drawdown: number;
  created_at: Date;
  closed_at?: Date;
  updated_at: Date;
}

export interface BuyLot {
  id: string;
  position_id: string;
  execution_id: string;
  qty_remaining: number;
  price: number;
  created_at: Date;
}

export interface LotMatch {
  id: string;
  sell_execution_id: string;
  buy_lot_id: string;
  quantity: number;
  realized_pnl: number;
  created_at: Date;
}

export interface CashFlow {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: CashFlowType;
  note?: string;
  created_at: Date;
}

export interface Settings {
  id: string;
  starting_cash: number;
  default_fee: number;
  risk_pct: number;
  entry_reasons: string[];
  exit_reasons: string[];
  timezone: string;
  benchmark_source: string;
  api_key: string;
  updated_at: Date;
}

export interface BenchmarkPrice {
  id: string;
  date: string; // YYYY-MM-DD
  close: number;
  created_at: Date;
}

export interface CreateExecutionRequest {
  symbol: string;
  side: ExecutionSide;
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

export interface UpdateExecutionRequest {
  notes?: string;
  entry_reason?: string;
  exit_reason?: string;
  status?: ExecutionStatus;
}

export interface StatsOverview {
  equity: number;
  realized_pnl: number;
  unrealized_pnl: number;
  max_drawdown: number;
  winrate: number;
  payoff: number;
  avg_risk_per_trade: number;
  r_distribution: Record<string, number>;
  top_symbols: Array<{
    symbol: string;
    pnl: number;
    trades: number;
  }>;
  top_setups: Array<{
    setup: string;
    pnl: number;
    trades: number;
    winrate: number;
  }>;
}

export interface DailyPnL {
  date: string;
  realized_pnl: number;
  symbols: string[];
}

export interface SetupStats {
  setup: string;
  winrate: number;
  pnl: number;
  trades: number;
  payoff: number;
}