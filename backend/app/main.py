import asyncio
import json
from datetime import datetime
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.models.transaction import TransactionSchema
from app.simulator.chaos_simulator import ChaosSimulator
from app.agents.watchdog import WatchdogAgent
from app.agents.analyst import AnalystAgent
from app.agents.manager import ManagerAgent
from app.agents.assistant import AssistantAgent

app = FastAPI(title="PaySentinel API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
simulator = ChaosSimulator(base_tps=5)
watchdog = WatchdogAgent()
analyst = AnalystAgent()
manager = ManagerAgent()
assistant = AssistantAgent()

active_connections: List[WebSocket] = []
global_event_log: List[dict] = [] # In-memory store for recent events

class ChatRequest(BaseModel):
    query: str

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "inject_failure":
                simulator.inject_failure("manual_1", issuer="CHASE", error_code="500", failure_rate=0.8)
    except WebSocketDisconnect:
        active_connections.remove(websocket)

async def broadcast(message: dict):
    for connection in active_connections:
        try:
            await connection.send_json(message)
        except:
            pass

def log_event(agent: str, message: str, level: str = "info"):
    """Valid levels: info, warning, danger"""
    entry = {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "agent": agent,
        "message": message,
        "level": level
    }
    global_event_log.append(entry)
    # Keep last 50 events for context
    if len(global_event_log) > 50:
        global_event_log.pop(0)
    return entry

async def simulation_loop():
    print("Starting Simulation Loop...")
    async for tx in simulator.run():
        # 1. Feed Watchdog
        alert_type = watchdog.process_transaction(tx)
        
        agent_logs = []
        
        # 2. If Alert, Trigger Agents
        if alert_type:
            log_event("Watchdog", f"ALERT: {alert_type} on {tx.issuer}", "warning")
            
            # Analyst
            investigation = await analyst.investigate(alert_type, tx.issuer)
            diag_msg = f"Diagnosed: {investigation['root_cause']} (Conf: {investigation['confidence']})"
            agent_logs.append({"agent": "Analyst", "message": diag_msg})
            log_event("Analyst", diag_msg, "info")
            
            # Manager
            decision = await manager.decide_and_act(investigation, tx.issuer)
            if decision["decision"] != "MONITOR":
                action_msg = f"Action: {decision['decision']} - {decision['reason']}"
                agent_logs.append({"agent": "Manager", "message": action_msg})
                log_event("Manager", action_msg, "danger")

        # 3. Prepare payload
        payload = {
            "type": "transaction",
            "data": json.loads(tx.model_dump_json()),
            "alert": alert_type,
            "agent_logs": agent_logs 
        }
        
        # 4. Broadcast
        await broadcast(payload)
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "PaySentinel", "version": "2.0.4"}

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(simulation_loop())

@app.get("/")
def read_root():
    return {"status": "PaySentinel Backend Running"}

@app.post("/inject")
def trigger_injection(issuer: str = "CHASE"):
    simulator.inject_failure("api_trigger", issuer=issuer, failure_rate=0.9)
    log_event("System", f"Manual Injection Triggered for {issuer}", "danger")
    return {"status": "Injected failure for " + issuer}

@app.post("/rollback")
def rollback_action():
    result = manager.rollback_last_action()
    log_event("System", f"Rollback requested: {result['message']}", "warning")
    return result

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    # Construct context from recent logs
    context_str = "\n".join([f"[{e['timestamp']}] {e['agent']}: {e['message']}" for e in global_event_log])
    if not context_str:
        context_str = "No recent significant events."
        
    response = await assistant.chat(request.query, context_str)
    return {"response": response}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
