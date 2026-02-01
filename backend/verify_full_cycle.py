
import asyncio
import requests
import json
import time

BASE_URL = "http://localhost:8000"

async def test_full_cycle():
    print(f"--- STARTING FINAL SYSTEM VALIDATION ---")
    
    # 1. Check Health
    try:
        r = requests.get(f"{BASE_URL}/health")
        assert r.status_code == 200
        print("[pass] System Health Check")
    except Exception as e:
        print(f"[FAIL] System unreachable: {e}")
        return

    # 2. Inject Failure (Chaos)
    print("\n--- STEP 1: CHAOS INJECTION ---")
    r = requests.post(f"{BASE_URL}/inject?issuer=CHASE")
    assert r.status_code == 200
    print(f"[pass] Injected Latency Spike on CHASE")
    
    # 3. Wait for Watchdog & Manager (Observe -> Decide -> Act)
    # The system loop runs every 2s. We wait 10s to ensure multiple cycles.
    print("\n--- STEP 2: OBSERVING AGENT RESPONSE (Wait 10s) ---")
    time.sleep(10)
    
    # We can check the Chat/Logs to see if it happened, or check the internal state if we exposed an endpoint.
    # Since we can't easily check internal state via API, we use the Chat Bot to "Ask" what happened.
    # This verifies Memory (Short Term) and Awareness.
    
    print("\n--- STEP 3: VERIFYING OBSERVATIONS VIA CHAT ---")
    query = "What alerts did you see recently?"
    r = requests.post(f"{BASE_URL}/chat", json={"query": query})
    response = r.json()['response']
    print(f"Chat Response: {response}")
    
    if "CHASE" in response and "latency" in response.lower():
        print("[pass] System 'Remembered' the incident via Chat context.")
    else:
        print("[WARN] Chat context might be missing the incident.")

    # 4. Trigger Rollback (Recovery)
    print("\n--- STEP 4: TRIGGERING ROLLBACK ---")
    r = requests.post(f"{BASE_URL}/rollback")
    data = r.json()
    print(f"Rollback Response: {data}")
    
    if data.get("status") == "success":
        print("[pass] Rollback executed successfully.")
    else:
        print(f"[FAIL] Rollback failed: {data}")

    print("\n--- FINAL VALIDATION COMPLETE ---")

if __name__ == "__main__":
    asyncio.run(test_full_cycle())
