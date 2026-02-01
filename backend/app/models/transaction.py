from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

class PaymentMethod(str, Enum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BANK_TRANSFER = "bank_transfer"
    DIGITAL_WALLET = "digital_wallet"

class TransactionStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"
    RETRY = "retry"

class TransactionSchema(BaseModel):
    transaction_id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    amount: float
    currency: str
    payment_method: PaymentMethod
    issuer: str
    processor: str
    status: TransactionStatus
    error_code: Optional[str] = None
    latency_ms: int
    retry_count: int = 0
    bin_range: Optional[str] = None
    region: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_schema_extra = {
            "example": {
                "transaction_id": "tx_123456789",
                "timestamp": "2023-10-27T10:00:00",
                "amount": 100.50,
                "currency": "USD",
                "payment_method": "credit_card",
                "issuer": "CHASE",
                "processor": "STRIPE",
                "status": "success",
                "latency_ms": 120,
                "region": "US-EAST"
            }
        }
