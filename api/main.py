from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime, date
import sqlite3
import os
from contextlib import contextmanager
import hashlib
import secrets

app = FastAPI(
    title="Trading Manager API",
    description="API para gestión personal de trading",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especifica tu dominio
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()
API_KEY = os.getenv("API_KEY", "default-api-key-change-this")

# Database setup
DATABASE_PATH = "trading.db"

def get_api_key(x_api_key: str = Header(None)):
    if not x_api_key or x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key

@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# Pydantic models
class TradeCreate(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)
    side: Literal["BUY", "SELL"]
    quantity: float = Field(..., gt=0)
    price: float = Field(..., gt=0)
    commission: Optional[float] = Field(default=0, ge=0)
    executed_at: datetime
    source: Optional[str] = None
    source_id: Optional[str] = None
    notes: Optional[str] = None

class TradeResponse(BaseModel):
    id: int
    symbol: str
    side: str
    quantity: float
    price: float
    commission: float
    executed_at: datetime
    source: Optional[str]
    source_id: Optional[str]
    notes: Optional[str]
    created_at: datetime

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str
    service: str
    timezone: str
    database: str

# Initialize database
def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS trades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
                quantity REAL NOT NULL CHECK (quantity > 0),
                price REAL NOT NULL CHECK (price > 0),
                commission REAL DEFAULT 0 CHECK (commission >= 0),
                executed_at TIMESTAMP NOT NULL,
                source TEXT,
                source_id TEXT UNIQUE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create index for faster lookups
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_trades_source_id ON trades(source_id)
        """)
        
        # Create index on symbol and executed_at
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol)
        """)
        
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_trades_executed_at ON trades(executed_at)
        """)
        
        conn.commit()

# Initialize database on startup
init_db()

# Routes
@app.get("/", response_model=dict)
async def root():
    return {
        "message": "Trading Manager API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    try:
        with get_db() as conn:
            conn.execute("SELECT 1").fetchone()
        db_status = "Connected"
    except Exception:
        db_status = "Error"
    
    return HealthResponse(
        status="OK",
        timestamp=datetime.now(),
        version="1.0.0",
        service="Trading Manager API",
        timezone="Europe/Madrid",
        database=db_status
    )

@app.post("/trades", response_model=dict)
async def create_trade(
    trade: TradeCreate,
    api_key: str = Depends(get_api_key)
):
    try:
        with get_db() as conn:
            # Check for duplicate source_id
            if trade.source_id:
                existing = conn.execute(
                    "SELECT id FROM trades WHERE source_id = ?",
                    (trade.source_id,)
                ).fetchone()
                
                if existing:
                    return {
                        "status": "duplicate",
                        "message": "Trade with this source_id already exists",
                        "id": existing["id"]
                    }
            
            # Insert new trade
            cursor = conn.execute("""
                INSERT INTO trades (
                    symbol, side, quantity, price, commission, 
                    executed_at, source, source_id, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                trade.symbol.upper(),
                trade.side,
                trade.quantity,
                trade.price,
                trade.commission,
                trade.executed_at,
                trade.source,
                trade.source_id,
                trade.notes
            ))
            
            conn.commit()
            
            return {
                "status": "ok",
                "id": cursor.lastrowid,
                "message": "Trade created successfully"
            }
            
    except sqlite3.IntegrityError as e:
        if "source_id" in str(e):
            return {
                "status": "duplicate",
                "message": "Trade with this source_id already exists"
            }
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/trades/check")
async def check_trade_exists(
    source_id: str,
    api_key: str = Depends(get_api_key)
):
    try:
        with get_db() as conn:
            result = conn.execute(
                "SELECT id FROM trades WHERE source_id = ?",
                (source_id,)
            ).fetchone()
            
            return {
                "exists": result is not None,
                "id": result["id"] if result else None
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/trades", response_model=List[TradeResponse])
async def get_trades(
    symbol: Optional[str] = None,
    side: Optional[Literal["BUY", "SELL"]] = None,
    limit: int = 100,
    api_key: str = Depends(get_api_key)
):
    try:
        with get_db() as conn:
            query = "SELECT * FROM trades WHERE 1=1"
            params = []
            
            if symbol:
                query += " AND symbol = ?"
                params.append(symbol.upper())
            
            if side:
                query += " AND side = ?"
                params.append(side)
            
            query += " ORDER BY executed_at DESC LIMIT ?"
            params.append(limit)
            
            rows = conn.execute(query, params).fetchall()
            
            return [
                TradeResponse(
                    id=row["id"],
                    symbol=row["symbol"],
                    side=row["side"],
                    quantity=row["quantity"],
                    price=row["price"],
                    commission=row["commission"],
                    executed_at=datetime.fromisoformat(row["executed_at"]),
                    source=row["source"],
                    source_id=row["source_id"],
                    notes=row["notes"],
                    created_at=datetime.fromisoformat(row["created_at"])
                )
                for row in rows
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats/summary")
async def get_stats_summary(api_key: str = Depends(get_api_key)):
    try:
        with get_db() as conn:
            # Total trades
            total_trades = conn.execute("SELECT COUNT(*) as count FROM trades").fetchone()["count"]
            
            # Total volume
            total_volume = conn.execute("""
                SELECT SUM(quantity * price) as volume FROM trades
            """).fetchone()["volume"] or 0
            
            # Symbols traded
            symbols_count = conn.execute("""
                SELECT COUNT(DISTINCT symbol) as count FROM trades
            """).fetchone()["count"]
            
            # Recent trades
            recent_trades = conn.execute("""
                SELECT symbol, side, quantity, price, executed_at 
                FROM trades 
                ORDER BY executed_at DESC 
                LIMIT 5
            """).fetchall()
            
            return {
                "total_trades": total_trades,
                "total_volume": round(total_volume, 2),
                "symbols_count": symbols_count,
                "recent_trades": [
                    {
                        "symbol": trade["symbol"],
                        "side": trade["side"],
                        "quantity": trade["quantity"],
                        "price": trade["price"],
                        "executed_at": trade["executed_at"]
                    }
                    for trade in recent_trades
                ]
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)