from collections import deque
from statistics import mean, stdev
from typing import Dict, List
from app.models.transaction import TransactionSchema, TransactionStatus

class WatchdogAgent:
    def __init__(self, window_size: int = 50, z_threshold: float = 2.0):
        self.window_size = window_size
        self.z_threshold = z_threshold
        # Store metrics per issuer
        self.latency_windows: Dict[str, deque] = {}
        self.success_windows: Dict[str, deque] = {}
        
    def process_transaction(self, tx: TransactionSchema):
        if tx.issuer not in self.latency_windows:
            self.latency_windows[tx.issuer] = deque(maxlen=self.window_size)
            self.success_windows[tx.issuer] = deque(maxlen=self.window_size)
            
        self.latency_windows[tx.issuer].append(tx.latency_ms)
        self.success_windows[tx.issuer].append(1 if tx.status == TransactionStatus.SUCCESS else 0)
        
        return self.detect_anomalies(tx.issuer)
        
    def detect_anomalies(self, issuer: str):
        latencies = self.latency_windows[issuer]
        if len(latencies) < 10:
            return # not enough data
            
        # Check Latency Spike
        avg_latency = mean(latencies)
        try:
            std_dev = stdev(latencies)
            if std_dev > 0 and (latencies[-1] - avg_latency) / std_dev > self.z_threshold:
                print(f"Watchdog ALERT: Latency Spike for {issuer}. Value: {latencies[-1]}ms, Z-Score > {self.z_threshold}")
                return "LATENCY_SPIKE"
        except ValueError:
            pass

        # Check Success Rate Drop (Simple threshold for now)
        successes = self.success_windows[issuer]
        if len(successes) > 10:
            rate = sum(successes) / len(successes)
            if rate < 0.8: # Below 80% success
                 print(f"Watchdog ALERT: Success Rate Drop for {issuer}. Rate: {rate*100:.1f}%")
                 return "SUCCESS_DROP"
        
        return None
