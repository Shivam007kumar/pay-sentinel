import asyncio
import random
import uuid
from datetime import datetime
from typing import AsyncGenerator, Dict, Optional, List

from app.models.transaction import (
    TransactionSchema, 
    TransactionStatus, 
    PaymentMethod
)

class ChaosSimulator:
    def __init__(self, base_tps: int = 1):
        self.base_tps = base_tps
        self.active_injections: Dict[str, Dict] = {}
        self.running = False
        
    def inject_failure(self, 
                      injection_id: str,
                      issuer: Optional[str] = None,
                      error_code: str = "500", 
                      failure_rate: float = 0.5,
                      latency_ms: int = 1500) -> str:
        """Inject specific failure scenario"""
        self.active_injections[injection_id] = {
            "issuer": issuer,
            "error_code": error_code,
            "failure_rate": failure_rate,
            "latency_ms": latency_ms
        }
        return f"Injection {injection_id} started."

    def stop_injection(self, injection_id: str):
        if injection_id in self.active_injections:
            del self.active_injections[injection_id]

    def _generate_transaction(self) -> TransactionSchema:
        # Defaults
        status = TransactionStatus.SUCCESS
        error_code = None
        latency = random.randint(50, 300) # Baseline latency
        issuer = random.choice(["CHASE", "BOA", "WELLS", "STRIPE_TEST"])
        
        # Check active injections
        for _, params in self.active_injections.items():
            # If issuer matches (or global injection)
            if params["issuer"] is None or params["issuer"] == issuer:
                if random.random() < params["failure_rate"]:
                    status = TransactionStatus.FAILED
                    error_code = params["error_code"]
                    # Add latency spike if defined
                    if "latency_ms" in params:
                        latency = params["latency_ms"] + random.randint(-100, 100)

        return TransactionSchema(
            transaction_id=f"tx_{uuid.uuid4().hex[:12]}",
            timestamp=datetime.now(),
            amount=round(random.uniform(10.0, 500.0), 2),
            currency="USD",
            payment_method=random.choice(list(PaymentMethod)),
            issuer=issuer,
            processor="STRIPE",
            status=status,
            error_code=error_code,
            latency_ms=latency,
            region=random.choice(["US-EAST", "US-WEST", "EU-CENTRAL"]),
            metadata={"environment": "production"}
        )

    async def run(self) -> AsyncGenerator[TransactionSchema, None]:
        self.running = True
        while self.running:
            tx = self._generate_transaction()
            yield tx
            # Sleep to maintain approximate TPS
            await asyncio.sleep(1.0 / self.base_tps)
