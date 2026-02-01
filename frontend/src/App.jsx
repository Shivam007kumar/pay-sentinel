import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, ShieldAlert, Cpu, Terminal, Zap, Power, RotateCcw, MessageSquare, Send, X } from 'lucide-react';

// Theme Configuration
const THEME = {
  colors: {
    success: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    danger: '#ef4444',  // red-500
    primary: '#3b82f6', // blue-500
    accent: '#8b5cf6',  // violet-500
    cyan: '#06b6d4',    // cyan-500
  }
};

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [graphData, setGraphData] = useState([]);
  const [metrics, setMetrics] = useState({ tps: 0, successRate: 100, avgLatency: 0 });
  const [logs, setLogs] = useState([]);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isUplinkOpen, setIsUplinkOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Sentinel Assistant Online. Awaiting queries.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  // Buffer for high-frequency updates
  const dataBuffer = useRef([]);

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket('ws://localhost:8000/ws/stream');

    ws.onopen = () => {
      setIsConnected(true);
      addLog('System', 'Uplink Established: PaySentinel Core Active');
    };

    ws.onclose = () => {
      setIsConnected(false);
      addLog('System', 'Uplink Severed: Connection Lost');
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'transaction') {
        processTransaction(payload.data, payload.alert, payload.agent_logs);
      }
    };

    return () => ws.close();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Throttled State Update Loop (10 FPS)
  useEffect(() => {
    const interval = setInterval(() => {
      const newItems = dataBuffer.current;

      if (newItems.length > 0) {
        setGraphData(prev => {
          const combined = [...prev, ...newItems];
          // Keep last 50 points for a faster moving chart feel
          return combined.slice(-50);
        });

        updateMetrics(newItems);
        dataBuffer.current = [];
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const processTransaction = (tx, alert, agentLogs) => {
    dataBuffer.current.push({
      time: new Date(tx.timestamp).toLocaleTimeString(),
      latency: tx.latency_ms,
      status: tx.status,
      id: tx.transaction_id
    });

    if (alert) {
      addLog('Watchdog', `ANOMALY DETECTED: ${alert} [${tx.issuer}]`, 'warning');
    }

    if (agentLogs && agentLogs.length > 0) {
      agentLogs.forEach(log => {
        addLog(log.agent, log.message, 'info');
      });
    }
  };

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateMetrics = (newItems) => {
    const total = newItems.length;
    const successes = newItems.filter(i => i.status === 'success').length;
    const latencies = newItems.map(i => i.latency);

    setMetrics(prev => ({
      tps: Math.round(total * 10),
      successRate: Math.round((successes / total) * 100) || prev.successRate,
      avgLatency: Math.round(latencies.reduce((a, b) => a + b, 0) / total) || prev.avgLatency
    }));
  };

  const addLog = (agent, message, type = 'default') => {
    setLogs(prev => [{
      time: new Date().toLocaleTimeString(),
      agent,
      message,
      type
    }, ...prev.slice(0, 49)]);
  };

  const triggerInjection = async () => {
    try {
      showToast('Injecting Chaos via API...', 'warning');
      await fetch('http://localhost:8000/inject?issuer=CHASE', { method: 'POST' });
      addLog('System', 'INJECTING CHAOS SEQUENCE: TARGET [CHASE]', 'danger');
      showToast('Chaos Injected Successfully', 'success');
    } catch (e) {
      addLog('System', 'Command Failed: Injection Error', 'danger');
      showToast('Injection Failed', 'error');
    }
  };

  const triggerRollback = async () => {
    try {
      showToast('Initiating Emergency Rollback...', 'warning');
      const res = await fetch('http://localhost:8000/rollback', { method: 'POST' });
      const data = await res.json();
      addLog('System', `ROLLBACK PROTOCOL: ${data.message} `, 'warning');
      showToast('Rollback Complete', 'success');
    } catch (e) {
      addLog('System', 'Command Failed: Rollback Error', 'danger');
      showToast('Rollback Failed', 'error');
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error: Neural Link Unreachable' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="h-screen bg-cyber-dark text-gray-100 font-sans p-6 overflow-hidden flex flex-col cyber-gradient-bg relative selection:bg-cyan-500/30">

      {/* Background Grid Effect */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,99,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(18,16,99,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

      {/* Header */}
      <header className="flex justify-between items-center mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]">
            <ShieldAlert className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              PaySentinel <span className="text-sm font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">v2.0.4</span>
            </h1>
            <p className="text-sm text-gray-400 font-mono tracking-wide">AUTONOMOUS PAYMENT OPS • CONNECTED</p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setIsUplinkOpen(true)}
            className="px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-xs font-mono text-cyan-400 hover:bg-cyan-900/20 hover:border-cyan-500/30 transition-all duration-300 flex items-center gap-2 group cursor-pointer hover:shadow-lg hover:shadow-cyan-500/10 active:scale-95"
          >
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full group-hover:shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all"></span>
            CORE UPLINK
          </button>
          <button className="px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-xs font-mono text-emerald-400 hover:bg-emerald-900/20 hover:border-emerald-500/30 transition-all duration-300 flex items-center gap-2 group cursor-pointer hover:shadow-lg hover:shadow-emerald-500/10 active:scale-95">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full group-hover:shadow-[0_0_8px_rgba(52,211,153,0.8)] transition-all"></span>
            WATCHDOG AGENT
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 relative z-10">

        {/* Left Col: Live Data (8 cols) */}
        {/* Left Col: Live Data (8 cols) */}
        <div className="col-span-8 flex flex-col gap-6 min-h-0 h-full">

          {/* Metrics Row */}
          <div className="grid grid-cols-3 gap-6">
            <MetricCard
              label="Throughput (TPS)"
              value={metrics.tps}
              icon={Zap}
              color="text-cyan-400"
              bg="bg-cyan-500/10"
              border="border-cyan-500/20"
            />
            <MetricCard
              label="Success Rate"
              value={`${metrics.successRate}% `}
              icon={Activity}
              color={metrics.successRate < 95 ? "text-red-400" : "text-emerald-400"}
              bg={metrics.successRate < 95 ? "bg-red-500/10" : "bg-emerald-500/10"}
              border={metrics.successRate < 95 ? "border-red-500/20" : "border-emerald-500/20"}
            />
            <MetricCard
              label="Avg Latency"
              value={`${metrics.avgLatency} ms`}
              icon={Cpu}
              color="text-purple-400"
              bg="bg-purple-500/10"
              border="border-purple-500/20"
            />
          </div>

          {/* Graph */}
          <div className="flex-1 glass-panel rounded-2xl p-6 min-h-[400px] flex flex-col relative overflow-hidden group">
            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent h-[10%] animate-scanline pointer-events-none opacity-50"></div>

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-mono text-cyan-300/70 tracking-widest uppercase flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                Live Transaction Stream
              </h3>
              <div className="text-xs font-mono text-gray-500">REALTIME MONITORING</div>
            </div>

            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis
                    stroke="rgba(255,255,255,0.2)"
                    fontSize={10}
                    fontFamily="JetBrains Mono"
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(3, 7, 18, 0.9)',
                      backdropFilter: 'blur(8px)',
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '12px'
                    }}
                    itemStyle={{ color: THEME.colors.cyan }}
                  />
                  <Line
                    type="monotone"
                    dataKey="latency"
                    stroke={THEME.colors.cyan}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Col: Agent Logs & Controls (4 cols) */}
        <div className="col-span-4 flex flex-col gap-6 h-full min-h-0">
          {/* Controls */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-xs font-mono text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Power size={14} /> Override Controls
            </h3>
            <div className="space-y-3">
              <button
                onClick={triggerInjection}
                className="w-full group relative overflow-hidden rounded-xl bg-red-500/10 border border-red-500/20 p-4 transition-all hover:bg-red-500/20 hover:border-red-500/40 hover:shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)] active:scale-95 active:bg-red-500/30"
              >
                <div className="flex items-center justify-center gap-3 relative z-10">
                  <Zap className="text-red-400 group-hover:scale-110 transition-transform" size={18} />
                  <span className="font-semibold text-red-100">INJECT CHAOS</span>
                </div>
              </button>

              <button
                onClick={triggerRollback}
                className="w-full group relative overflow-hidden rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 transition-all hover:bg-amber-500/20 hover:border-amber-500/40 hover:shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)] active:scale-95 active:bg-amber-500/30"
              >
                <div className="flex items-center justify-center gap-3 relative z-10">
                  <RotateCcw className="text-amber-400 group-hover:-rotate-90 transition-transform duration-500" size={18} />
                  <span className="font-semibold text-amber-100">EMERGENCY ROLLBACK</span>
                </div>
              </button>
            </div>
          </div>

          {/* Logs */}
          <div className="flex-1 glass-panel rounded-2xl p-6 overflow-hidden flex flex-col min-h-0">
            <h3 className="text-xs font-mono text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Terminal size={14} /> Agent Neural Link
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs pr-2 custom-scrollbar pb-20">
              {logs.map((log, i) => (
                <div key={i} className={`
                  relative pl - 4 py - 2 rounded border - l - 2
                  ${log.agent === 'Watchdog' ? 'border-yellow-500/50 bg-yellow-500/5' :
                    log.type === 'danger' ? 'border-red-500/50 bg-red-500/5' :
                      'border-blue-500/50 bg-blue-500/5'
                  }
`}>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span className="uppercase tracking-wider opacity-70">{log.agent}</span>
                    <span>{log.time}</span>
                  </div>
                  <div className={`
                    ${log.type === 'danger' ? 'text-red-300' :
                      log.type === 'warning' ? 'text-yellow-300' : 'text-blue-300'
                    }
`}>
                    {log.message}
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-gray-600 italic text-center mt-10">
                  Waiting for neural activity...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all z-50 group"
      >
        {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Chat Window */}
      {isChatOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] glass-panel rounded-2xl flex flex-col overflow-hidden z-20 animate-in slide-in-from-bottom-10 fade-in duration-300 shadow-2xl shadow-black/50">
          <div className="p-4 border-b border-white/10 bg-gray-900/50 flex items-center justify-between">
            <h3 className="font-mono text-sm uppercase tracking-wider text-blue-400 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Sentinel Assistant
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} `}>
                <div className={`
                  max-w-[80%] p-3 rounded-lg text-sm
                  ${msg.role === 'user'
                    ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100 rounded-br-none'
                    : 'bg-gray-800/80 border border-gray-700 text-gray-200 rounded-bl-none'
                  }
                `}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800/80 p-3 rounded-lg rounded-bl-none text-xs text-gray-400 animate-pulse">
                  Processing query...
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={handleChatSubmit} className="p-4 border-t border-white/10 bg-gray-900/50">
            <div className="relative">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about system status..."
                className="w-full bg-black/30 border border-gray-700 rounded-lg pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="submit"
                disabled={isChatLoading}
                className="absolute right-2 top-2 p-1.5 rounded-md hover:bg-blue-500/20 text-blue-400 disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Core Uplink Modal */}
      {isUplinkOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-12 animate-in fade-in duration-200">
          <div className="w-full max-w-6xl h-full bg-gray-900/90 border border-cyan-500/20 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">

            {/* Modal Header */}
            <div className="p-6 border-b border-cyan-500/20 flex justify-between items-center bg-cyan-950/20">
              <div className="flex items-center gap-4">
                <Activity className="text-cyan-400" size={32} />
                <div>
                  <h2 className="text-2xl font-mono font-bold text-cyan-100 tracking-wider">SYSTEM NEURAL ARCH</h2>
                  <div className="text-xs text-cyan-500 font-mono">INTERNAL STATE MONITORING // RESTRICTED ACCESS</div>
                </div>
              </div>
              <button
                onClick={() => setIsUplinkOpen(false)}
                className="p-2 hover:bg-cyan-500/10 rounded-lg transition-colors text-cyan-400"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-8 grid grid-cols-3 gap-8 overflow-y-auto font-mono text-sm relative custom-scrollbar">
              {/* Scanline */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-0 bg-[length:100%_2px,3px_100%] opacity-20"></div>

              {/* Watchdog Panel */}
              <div className="border border-emerald-500/20 rounded-xl p-6 bg-emerald-950/20 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                  <ShieldAlert size={18} /> WATCHDOG AGENT
                </h3>
                <div className="space-y-4 text-emerald-100/80 relative z-10">
                  <div className="flex justify-between border-b border-emerald-500/10 pb-2">
                    <span>Status</span>
                    <span className="text-emerald-400 animate-pulse">ACTIVE MONITORING</span>
                  </div>
                  <div className="flex justify-between border-b border-emerald-500/10 pb-2">
                    <span>Sampling Rate</span>
                    <span>100ms</span>
                  </div>
                  <div className="flex justify-between border-b border-emerald-500/10 pb-2">
                    <span>Anomaly Threshold</span>
                    <span>Z-Score &gt; 3.0</span>
                  </div>
                  <div className="mt-4 p-3 bg-black/40 rounded font-mono text-xs h-32 overflow-y-auto custom-scrollbar">
                    {`> Monitoring ${metrics.tps} TPS stream...`}
                    <br />
                    {`> Latency variance: ${Math.random().toFixed(3)}`}
                  </div>
                </div>
              </div>

              {/* Analyst Panel */}
              <div className="border border-blue-500/20 rounded-xl p-6 bg-blue-950/20 relative overflow-hidden group hover:border-blue-500/40 transition-colors">
                <h3 className="text-blue-400 font-bold mb-4 flex items-center gap-2">
                  <Zap size={18} /> ANALYST AGENT
                </h3>
                <div className="space-y-4 text-blue-100/80 relative z-10">
                  <div className="flex justify-between border-b border-blue-500/10 pb-2">
                    <span>Logic Core</span>
                    <span>GPT-4o (Simulated)</span>
                  </div>
                  <div className="flex justify-between border-b border-blue-500/10 pb-2">
                    <span>Context Window</span>
                    <span>128k Tokens</span>
                  </div>
                  <div className="mt-4 p-3 bg-black/40 rounded font-mono text-xs h-32 overflow-y-auto custom-scrollbar">
                    {logs.filter(l => l.agent === 'Analyst').slice(0, 3).map((l, i) => (
                      <div key={i} className="mb-2 opacity-80 border-b border-blue-500/10 pb-1">
                        {`> ${l.message}`}
                      </div>
                    ))}
                    {logs.filter(l => l.agent === 'Analyst').length === 0 && "> Waiting for trigger..."}
                  </div>
                </div>
              </div>

              {/* Manager Panel */}
              <div className="border border-purple-500/20 rounded-xl p-6 bg-purple-950/20 relative overflow-hidden group hover:border-purple-500/40 transition-colors">
                <h3 className="text-purple-400 font-bold mb-4 flex items-center gap-2">
                  <Activity size={18} /> MANAGER AGENT
                </h3>
                <div className="space-y-4 text-purple-100/80 relative z-10">
                  <div className="flex justify-between border-b border-purple-500/10 pb-2">
                    <span>Authorization</span>
                    <span className="text-purple-400">LEVEL 5 (AUTONOMOUS)</span>
                  </div>
                  <div className="flex justify-between border-b border-purple-500/10 pb-2">
                    <span>Tool Access</span>
                    <span>FULL WRITE</span>
                  </div>
                  <div className="mt-4 p-3 bg-black/40 rounded font-mono text-xs h-32 overflow-y-auto custom-scrollbar">
                    {logs.filter(l => l.agent === 'Manager').slice(0, 3).map((l, i) => (
                      <div key={i} className="mb-2 opacity-80 border-b border-purple-500/10 pb-1">
                        {`> ${l.message}`}
                      </div>
                    ))}
                    {logs.filter(l => l.agent === 'Manager').length === 0 && "> Awaiting Escalation..."}
                  </div>
                </div>
              </div>

              {/* Full Log Dump */}
              <div className="col-span-3 mt-8 border-t border-cyan-500/20 pt-6">
                <h3 className="text-cyan-500/70 mb-4 text-xs tracking-widest uppercase">Global Event Bus (Raw)</h3>
                <div className="bg-black/50 p-4 rounded-xl h-48 overflow-y-auto font-mono text-xs text-gray-400 custom-scrollbar">
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1 border-b border-white/5 pb-1">
                      <span className="text-cyan-600">[{log.time}]</span> <span className="text-yellow-600">[{log.agent.toUpperCase()}]</span> {log.message}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl backdrop-blur-md border shadow-2xl z-50 animate-fade-in-up font-mono text-sm flex items-center gap-3
          ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' :
            toast.type === 'warning' ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' :
              toast.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-300' :
                'bg-blue-500/20 border-blue-500/30 text-blue-300'
          }
        `}>
          {toast.type === 'success' && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
          {toast.type === 'warning' && <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
          {toast.type === 'error' && <div className="w-2 h-2 rounded-full bg-red-400" />}
          {toast.message}
        </div>
      )}

    </div>
  )
}

function MetricCard({ label, value, icon: Icon, color, bg, border }) {
  return (
    <div className={`glass - panel p - 6 rounded - 2xl flex items - center gap - 5 transition - transform hover: scale - [1.02] duration - 300`}>
      <div className={`p-4 rounded-xl`}>
        <Icon className={color} size={32} />
      </div>
      <div>
        <div className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-1">{label}</div>
        <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
      </div>
    </div>
  )
}

function StatusBadge({ label, status }) {
  return (
    <div className={`
      flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-medium
      ${status
        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_-4px_rgba(16,185,129,0.5)]'
        : 'bg-red-500/20 border-red-500/50 text-red-300'
      }
    `}>
      <div className={`w-1.5 h-1.5 rounded-full ${status ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'} `} />
      <span>{label}</span>
    </div>
  )
}

export default App
