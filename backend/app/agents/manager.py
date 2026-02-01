import os
from typing import Dict, Any
from dotenv import load_dotenv
from app.tools.definitions import AVAILABLE_TOOLS

load_dotenv()

class ManagerAgent:
    def __init__(self):
        self.tools = AVAILABLE_TOOLS
        self.decision_history = []
    
    async def decide_and_act(self, investigation: Dict[str, Any], issuer: str) -> Dict[str, Any]:
        """
        Takes the Analyst's investigation and executes actions.
        """
        print(f"MANAGER: Reviewing investigation for {issuer}...")
        
        action = investigation.get("recommended_action")
        confidence = investigation.get("confidence", 0.0)
        root_cause = investigation.get("root_cause")
        
        print(f"DEBUG: Manager Decision - Action: {action}, Confidence: {confidence}, Issuer: {issuer}")

        decision_log = {
            "decision": "MONITOR",
            "reason": "Confidence too low or no action needed.",
            "tool_output": None
        }

        # Policy Check: Only act if confidence > 0.8
        # Policy Check: Only act if confidence > 0.8
        if confidence > 0.8:
            if action and "route traffic" in action.lower().replace("_", " "):
                print(f"MANAGER: High confidence ({confidence}) issue detected: {root_cause}. EXECUTE Mitigations.")
                
                # Execute Tool
                tool = self.tools["route_traffic"]
                # Logic: Route 50% away from failing issuer to STRIPE (fallback)
                result = tool.execute(percentage=50, destination="STRIPE", target_issuer=issuer)
                
                decision_log = {
                    "decision": "ROUTED_TRAFFIC",
                    "reason": f"Mitigating {root_cause}",
                    "tool_output": result.dict(),
                    "issuer": issuer
                }
                
                self.decision_history.append(decision_log)
        else:
            print(f"MANAGER: Confidence {confidence} below threshold. Monitoring.")

        return decision_log

    def rollback_last_action(self) -> Dict[str, Any]:
        if not self.decision_history:
            return {"status": "failed", "message": "No actions to rollback"}
        
        last_action = self.decision_history.pop()
        
        if last_action["decision"] == "ROUTED_TRAFFIC":
            # Reverse the routing (Route 0% / Reset)
            tool = self.tools["route_traffic"]
            issuer = last_action["issuer"]
            # In a real system, we'd restore previous state. Here we just reset to 0 diversion.
            tool.execute(percentage=0, destination="ORIGINAL", target_issuer=issuer)
            return {"status": "success", "message": f"Rolled back routing for {issuer}", "original_action": last_action}
            
        return {"status": "failed", "message": "Unknown action type"}
