// Cliente API para conectar con FastAPI backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'default-api-key-change-this';

interface ApiResponse<T> {
  status: string;
  data?: T;
  message?: string;
  error?: string;
}

interface TradeData {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  commission?: number;
  executed_at: string;
  source?: string;
  source_id?: string;
  notes?: string;
}

class TradingAPI {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.apiKey = API_KEY;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    return this.request<{
      status: string;
      timestamp: string;
      version: string;
      service: string;
      timezone: string;
      database: string;
    }>('/health');
  }

  // Create trade
  async createTrade(trade: TradeData) {
    return this.request<{
      status: string;
      id?: number;
      message: string;
    }>('/trades', {
      method: 'POST',
      body: JSON.stringify(trade),
    });
  }

  // Check if trade exists
  async checkTradeExists(sourceId: string) {
    return this.request<{
      exists: boolean;
      id?: number;
    }>(`/trades/check?source_id=${encodeURIComponent(sourceId)}`);
  }

  // Get trades
  async getTrades(filters: {
    symbol?: string;
    side?: 'BUY' | 'SELL';
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();
    
    if (filters.symbol) params.append('symbol', filters.symbol);
    if (filters.side) params.append('side', filters.side);
    if (filters.limit) params.append('limit', filters.limit.toString());
    
    const query = params.toString();
    const endpoint = query ? `/trades?${query}` : '/trades';
    
    return this.request<Array<{
      id: number;
      symbol: string;
      side: string;
      quantity: number;
      price: number;
      commission: number;
      executed_at: string;
      source?: string;
      source_id?: string;
      notes?: string;
      created_at: string;
    }>>(endpoint);
  }

  // Get stats summary
  async getStatsSummary() {
    return this.request<{
      total_trades: number;
      total_volume: number;
      symbols_count: number;
      recent_trades: Array<{
        symbol: string;
        side: string;
        quantity: number;
        price: number;
        executed_at: string;
      }>;
    }>('/stats/summary');
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      console.error('API connection failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const tradingAPI = new TradingAPI();

// Export types
export type { TradeData, ApiResponse };