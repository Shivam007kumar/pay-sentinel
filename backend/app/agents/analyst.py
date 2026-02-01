import os
import json
from typing import Dict, Any, List
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

from app.tools.definitions import AVAILABLE_TOOLS

load_dotenv()

class AnalystInvestigation(BaseModel):
    root_cause: str = Field(description="The identified root cause of the anomaly")
    confidence: float = Field(description="Confidence score between 0.0 and 1.0")
    evidence: List[str] = Field(description="List of evidence supporting the diagnosis")
    recommended_action: str = Field(description="High level recommendation (e.g. 'Route Traffic')")

class AnalystAgent:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.tools = AVAILABLE_TOOLS
        if self.api_key and self.api_key.startswith("sk-"):
            self.llm = ChatOpenAI(model="gpt-4o", temperature=0)
            self._setup_chain()
        else:
            self.llm = None
            print("WARNING: AnalystAgent running in MOCK mode (No OpenAI Key)")

    def _setup_chain(self):
        system_prompt = """You are an expert Payment Support Analyst. 
        Your job is to diagnose payment anomalies based on the provided alert and tool outputs.
        
        You have access to these tools (results provided):
        - check_external_status: Checks status pages of banks.
        - query_database: Checks historical error counts.

        Analyze the situation and provide a structured diagnosis.
        """
        
        parser = JsonOutputParser(pydantic_object=AnalystInvestigation)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "Alert: {alert}\nContext: {context}\n\nProvide diagnosis.\n{format_instructions}")
        ])

        self.chain = prompt | self.llm | parser

    async def investigate(self, alert: str, issuer: str) -> Dict[str, Any]:
        """
        Main entry point. 
        1. Uses tools to gather context.
        2. Calls LLM (or mock) to diagnose.
        """
        print(f"ANALYST: Investigating {alert} on {issuer}...")
        
        # 1. Gather Context (Hardcoded tool usage for now to save latency/complexity)
        # In a real agent loop, the LLM would decide which tools to call.
        context = {}
        
        # Check external status for the issuer
        status_tool = self.tools["check_external_status"]
        status_result = status_tool.execute(issuer)
        context["external_status"] = status_result.data
        
        # Query DB for recent errors (Mock query)
        db_tool = self.tools["query_database"]
        db_result = db_tool.execute(f"SELECT * FROM errors WHERE issuer='{issuer}' AND time > NOW() - INTERVAL '5 min'")
        context["recent_errors"] = db_result.data
        
        # 2. Diagnose
        if self.llm:
            try:
                result = self.chain.invoke({
                    "alert": alert,
                    "context": str(context),
                    "format_instructions": JsonOutputParser(pydantic_object=AnalystInvestigation).get_format_instructions()
                })
                return result
            except Exception as e:
                print(f"ANALYST ERROR: {e}")
                return self._mock_diagnosis(alert, issuer, context)
        else:
            return self._mock_diagnosis(alert, issuer, context)

    def _mock_diagnosis(self, alert, issuer, context):
        """Fallback if no LLM"""
        is_degraded = context.get("external_status", {}).get("status") == "degraded"
        
        if is_degraded:
            return {
                "root_cause": f"External outage detected at {issuer}",
                "confidence": 0.95,
                "evidence": [f"{issuer} status page reports 'degraded'"],
                "recommended_action": "route_traffic"
            }
        else:
            return {
                "root_cause": "Unknown latency spike",
                "confidence": 0.5,
                "evidence": ["No external incidents reported", "High error count in DB"],
                "recommended_action": "monitor"
            }
