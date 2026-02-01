# 🛡️ PaySentinel: Autonomous Payment Operations AI

> "The Watcher on the Wall for your Transaction Stream."

PaySentinel is a next-gen autonomous agent system designed to monitor, analyze, and protect payment gateways in real-time. Built with a multi-agent architecture, it proactively detects anomalies, reasons about their root causes, and executes mitigation strategies without human intervention.

## 🏗️ Architecture

The system is composed of two main pillars:

### 1. The Neural Core (Backend)
Powered by **Python/FastAPI**, hosting three specialized AI agents:
- **🔰 Watchdog Agent**: A high-frequency anomaly detector monitoring the live TPS (Transactions Per Second) stream.
- **⚡ Analyst Agent**: A reasoning engine (Simulated GPT-4o) that investigates anomalies flagged by the Watchdog and proposes solutions.
- **👑 Manager Agent**: The executive decision-maker with write-access to system tools. It authorizes and executes recovery actions (e.g., traffic routing, rate limiting).

### 2. The Command Deck (Frontend)
A **React/Vite** dashboard featuring a "CyberCypher" aesthetic:
- **Live Telemetry**: Real-time TPS graphs and system health metrics.
- **System Neural Arch**: A deep-dive modal (`Core Uplink`) revealing the internal thought processes of the agents.
- **Chaos Simulator**: A tool to inject artificial latency/failures to test the system's resilience.

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 18+

### Installation

#### 1. Wake the Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
*The API will go live at `http://localhost:8000`*

#### 2. Jack In the Frontend
```bash
cd frontend
npm install
npm run dev
```
*The Dashboard will launch at `http://localhost:5173`*

## 🕹️ Usage

1.  **Monitor**: Watch the **TPS Graph** for real-time traffic visualization.
2.  **Inject Chaos**: Click the **INJECT CHAOS** button to simulate a "High Latency" event.
3.  **Observe Autonomy**:
    *   The **Watchdog** will turn RED and alert the system.
    *   The **Analyst** will diagnose the issue.
    *   The **Manager** will execute a `ROUTED_TRAFFIC` action.
    *   The system will self-heal.
4.  **Deep Dive**: Click **CORE UPLINK** to open the System Neural Arch and view raw agent logs.
5.  **Rollback**: If things get out of hand, hit **EMERGENCY ROLLBACK** to reset the system.

## 📁 Project Structure

```
pay-sentinel/
├── backend/            # FastAPI Application
│   ├── app/
│   │   ├── agents/    # Watchdog, Analyst, Manager logic
│   │   └── main.py    # API Entry point & WebSocket manager
├── frontend/           # React Application
│   ├── src/           # Components, Hooks, Styles
│   └── index.css      # Cyberpunk Design Tokens
└── README.md           # You are here
```

## 📜 License

MIT License. Built for the Future of FinTech.
