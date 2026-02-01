from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

class AssistantAgent:
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.7)
        self.system_prompt = """
        You are the 'Sentinel Assistant', an AI embedded in the PaySentinel Payment Operations Center.
        Your job is to answer the user's questions about the payment system's status, recent alerts, and performance.
        
        You will be provided with a 'Context' containing recent logs and metrics.
        
        Guidelines:
        - Be concise and professional, like a military or sci-fi operator.
        - If everything is normal, report all systems nominal.
        - If there were alerts, summarize what happened and what the agents (Watchdog, Analyst, Manager) did.
        - Do not hallucinate events that are not in the context.
        """

    async def chat(self, user_query: str, system_context: str) -> str:
        messages = [
            SystemMessage(content=self.system_prompt),
            HumanMessage(content=f"Context:\n{system_context}\n\nUser Question: {user_query}")
        ]
        
        try:
            response = await self.llm.ainvoke(messages)
            return response.content
        except Exception as e:
            return f"Error contacting Neural Core: {str(e)}"
