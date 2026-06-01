import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function InstanceWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [node, setNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Terminal System
  const [terminalHistory, setTerminalHistory] = useState([]);
  const [terminalInput, setTerminalInput] = useState('');
  const [ws, setWs] = useState(null); // Holds the WebSocket connection
  const terminalEndRef = useRef(null);

  // Tab Panel & Nested Virtual Systems (NEW)
  const [activeTab, setActiveTab] = useState('terminal'); // 'terminal' or 'vsystems'
  const [vsystems, setVsystems] = useState([]);
  const [loadingVsys, setLoadingVsys] = useState(true);
  
  // Modal & deployment state for nested systems (NEW)
  const [showDeployVsysModal, setShowDeployVsysModal] = useState(false);
  const [isDeployingVsys, setIsDeployingVsys] = useState(false);
  const [deployVsysParams, setDeployVsysParams] = useState({
    name: '',
    template: 'nginx',
    system_type: 'Proxy',
    image: 'nginx:alpine',
    port_mapping: '80:80'
  });

  const API_URL = `http://127.0.0.1:8000/api/v1/instances`;

  // 1. Fetch Node Data
  useEffect(() => {
    const fetchNodeDetails = async () => {
      try {
        const token = localStorage.getItem('nexus_token');
        const response = await axios.get(API_URL, { headers: { Authorization: `Bearer ${token}` } });
        const targetNode = response.data.data.find(n => n.id === id);
        if (targetNode) setNode(targetNode);
        else setError('Instance profile not found.');
      } catch (err) {
        setError('Failed to pull instance telemetry metrics.');
      } finally {
        setLoading(false);
      }
    };
    fetchNodeDetails();
  }, [id]);

  // 2. Connect to Python Terminal WebSocket
  useEffect(() => {
    if (node && node.status === 'running') {
      const token = localStorage.getItem('nexus_token');
      const socket = new WebSocket(`ws://127.0.0.1:8000/ws/terminal/${node.id}?token=${token}`);
      
      socket.onopen = () => {
        setTerminalHistory(prev => [...prev, `[SYSTEM] Secure WebSocket Uplink Established to Kernel.`]);
      };

      socket.onmessage = (event) => {
        setTerminalHistory(prev => [...prev, event.data]);
      };

      socket.onerror = (error) => {
        setTerminalHistory(prev => [...prev, `[ERROR] Secure connection refused. Security layer failed or terminal offline.`]);
      };

      socket.onclose = () => {
        setTerminalHistory(prev => [...prev, `[SYSTEM] Connection terminated by remote host.`]);
      };
      
      setWs(socket);
      return () => socket.close();
    }
  }, [node]);

  // 3. Fetch Nested Virtual Systems & Telemetry (NEW)
  const fetchVsystems = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await axios.get(`${API_URL}/${id}/virtual-systems`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVsystems(response.data.data);
    } catch (err) {
      console.error("Failed to query nested hypervisor:", err);
    } finally {
      setLoadingVsys(false);
    }
  };

  useEffect(() => {
    if (node && node.status === 'running') {
      fetchVsystems();
      const interval = setInterval(fetchVsystems, 4000);
      return () => clearInterval(interval);
    }
  }, [node]);

  // Helper to output live simulated logs to terminal history (NEW)
  const triggerTerminalLogs = (lines) => {
    lines.forEach((line, index) => {
      setTimeout(() => {
        setTerminalHistory(prev => [...prev, line]);
      }, index * 400);
    });
  };

  // 4. Send Command to Python
  const handleTerminalSubmit = (e) => {
    e.preventDefault();
    if (!terminalInput.trim() || !ws) return;
    
    const command = terminalInput.trim();
    
    if (command.toLowerCase() === 'clear' || command.toLowerCase() === 'cls') {
      setTerminalHistory([]);
      setTerminalInput('');
      return;
    }

    setTerminalHistory(prev => [...prev, `PS C:\\Nexus\\Node-${node.name}> ${command}`]);
    ws.send(command); // Sends the command to the backend to execute
    setTerminalInput('');
  };

  // 5. Deploy Nested System Handler (NEW)
  const handleDeployVsys = async (e) => {
    e.preventDefault();
    setIsDeployingVsys(true);
    try {
      const token = localStorage.getItem('nexus_token');
      await axios.post(`${API_URL}/${id}/virtual-systems`, deployVsysParams, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Close modal and refresh list
      setShowDeployVsysModal(false);
      fetchVsystems();

      // Trigger terminal logging connection
      triggerTerminalLogs([
        `[SYSTEM] Connecting to hypervisor on compute node '${node.name}'...`,
        `[DOCKER] Pulling blueprint image target '${deployVsysParams.image}'...`,
        `[DOCKER] Image downloaded: sha256:${Math.random().toString(16).substring(2,10)}...`,
        `[DOCKER] Provisioning virtual namespace and limits...`,
        `[DOCKER] Container '${deployVsysParams.name}' binds to interface port ${deployVsysParams.port_mapping}.`,
        `[SYSTEM] Success. Nested system is ONLINE.`
      ]);

      // Reset Form params
      setDeployVsysParams({
        name: '',
        template: 'nginx',
        system_type: 'Proxy',
        image: 'nginx:alpine',
        port_mapping: '80:80'
      });
    } catch (err) {
      alert("Hypervisor rejected container allocation.");
    } finally {
      setIsDeployingVsys(false);
    }
  };

  // 6. Toggle Nested System Power (NEW)
  const handleToggleVsysPower = async (vsysId, vsysName, currentStatus) => {
    try {
      const token = localStorage.getItem('nexus_token');
      await axios.put(`${API_URL}/${id}/virtual-systems/${vsysId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchVsystems();

      const nextStatus = currentStatus === 'running' ? 'stopped' : 'running';
      triggerTerminalLogs([
        `[SYSTEM] Altering run state of nested resource '${vsysName}'...`,
        `[DOCKER] Sending SIGTERM command to virtual system stack...`,
        `[SYSTEM] Virtual container '${vsysName}' state mutated to: ${nextStatus.toUpperCase()}`
      ]);
    } catch (err) {
      alert("Failed to toggle virtual system state.");
    }
  };

  // 7. Purge Nested System (NEW)
  const handleTerminateVsys = async (vsysId, vsysName) => {
    try {
      const token = localStorage.getItem('nexus_token');
      await axios.delete(`${API_URL}/${id}/virtual-systems/${vsysId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchVsystems();

      triggerTerminalLogs([
        `[SYSTEM] Purge command received for nested target '${vsysName}'...`,
        `[DOCKER] Killing process containers...`,
        `[DOCKER] Wiping persistent block cache directories...`,
        `[SYSTEM] Purge complete. Container '${vsysName}' completely destroyed.`
      ]);
    } catch (err) {
      alert("Failed to terminate virtual system.");
    }
  };

  // Update form parameters dynamically based on template selection (NEW)
  const handleTemplateChange = (tmpl) => {
    const templates = {
      nginx: { system_type: 'Proxy', image: 'nginx:alpine', port_mapping: '80:80' },
      postgres: { system_type: 'Database', image: 'postgres:15-alpine', port_mapping: '5432:5432' },
      redis: { system_type: 'Cache', image: 'redis:7-alpine', port_mapping: '6379:6379' },
      node: { system_type: 'Container', image: 'node:18-alpine', port_mapping: '3000:3000' },
      python: { system_type: 'Container', image: 'python:3.10-slim', port_mapping: '5000:5000' }
    };
    const details = templates[tmpl] || templates.nginx;
    setDeployVsysParams({
      ...deployVsysParams,
      template: tmpl,
      ...details
    });
  };

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalHistory]);

  if (loading) return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center text-cyan-400 font-mono text-xs tracking-widest animate-pulse">
      SYNCING_INSTANCE_CORE_WORKPLACE...
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen bg-[#030712] p-8 font-mono text-red-500 flex items-center justify-center flex-col border border-red-500/20">
      <div className="text-xl font-bold uppercase tracking-widest mb-4">⚠ SECURE_HANDSHAKE_FAILURE</div>
      <div className="text-xs">{error}</div>
      <button onClick={() => navigate('/console')} className="mt-8 border border-slate-700 hover:border-cyan-500 text-slate-400 hover:text-cyan-400 px-6 py-2 text-xs uppercase tracking-widest transition-all">
        Return to Safety
      </button>
    </div>
  );

  const activeVsystems = vsystems.filter(v => v.status === 'running').length;
  const memoryUsed = vsystems.reduce((acc, v) => v.status === 'running' ? acc + (v.memory_usage || 0) : acc, 0);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-300 flex flex-col font-mono relative overflow-hidden select-none">
      {/* Background Matrix Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      {/* Top Header Controls Bar */}
      <div className="bg-[#02040a]/95 border-b border-slate-800/80 h-14 flex items-center justify-between px-6 relative z-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/console')} 
            className="text-[10px] tracking-widest uppercase text-slate-400 hover:text-cyan-400 border border-slate-800 hover:border-cyan-500/40 bg-slate-900/60 px-4 py-1.5 rounded transition-all"
          >
            ← Exit Console
          </button>
          <span className="text-slate-700">|</span>
          <span className="text-sm font-bold text-white tracking-widest uppercase">{node.name}</span>
          <span className={`text-[8px] font-bold tracking-wider px-2 py-0.5 rounded border uppercase flex items-center gap-1.5 ${
            node.status === 'running' 
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400' 
              : 'bg-red-950/20 border-red-500/40 text-red-400'
          }`}>
            {node.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>}
            {node.status}
          </span>
        </div>
        
        <div className="text-[10px] text-slate-500 uppercase tracking-widest hidden md:block">
          Grid Node ID: <span className="text-cyan-400 font-mono">{node.id}</span>
        </div>
      </div>

      {/* Workspace Panel Matrix */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">
        
        {/* Left Side: Node Resource Stats */}
        <div className="w-full lg:w-72 bg-[#02050f]/80 p-6 border-r border-slate-800/80 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-2.5">// Hardware Specs</div>
              <div className="bg-slate-950/80 border border-slate-850 p-4 rounded space-y-3 font-mono">
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider">Hypervisor Profile</span>
                  <span className="text-xs text-white font-medium">{node.instance_type}</span>
                </div>
                <div className="flex flex-col gap-1 border-t border-slate-900 pt-2.5">
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider">Internal IPv4</span>
                  <span className="text-xs text-cyan-400 font-mono">{node.ip_address}</span>
                </div>
              </div>
            </div>
            
            {/* Dynamic Telemetry summary for Virtual Systems */}
            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-2.5">// Nested Core Stats</div>
              <div className="bg-slate-950/80 border border-slate-850 p-4 rounded space-y-2.5 font-mono">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-500 uppercase">Containers</span>
                  <span className="text-white font-bold">{activeVsystems} / {vsystems.length}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-500 uppercase">Memory Alloc</span>
                  <span className="text-cyan-400 font-bold">{memoryUsed} MB</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-2.5">// Energy Coefficient</div>
              <div className="bg-slate-950/80 border border-slate-850 p-4 rounded">
                <div className="text-sm font-bold text-amber-500 font-mono">
                  {node.cost_per_hour} TKN <span className="text-[9px] text-slate-500 font-normal uppercase">/ hr</span>
                </div>
                <div className="text-[8px] text-slate-500 uppercase tracking-wider mt-1.5">Micro-draining balance dynamically</div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-900 pt-5">
            <div className="text-[8px] text-slate-600 uppercase tracking-widest font-mono">Kernel Virtualization Interface</div>
            <div className="text-[8px] text-slate-600 uppercase tracking-widest font-mono mt-1">v4.9.1.CORE</div>
          </div>
        </div>

        {/* Right Side: Tabbed Interface Container */}
        <div className="flex-1 bg-black/95 flex flex-col overflow-hidden relative">
          
          {/* Cyber Dashboard Headers / Tabs */}
          <div className="flex bg-[#02050f] border-b border-slate-800/80 px-6 h-12 items-center justify-between">
            <div className="flex gap-6">
              <button 
                onClick={() => setActiveTab('terminal')}
                className={`text-[10px] uppercase tracking-widest font-bold h-12 border-b-2 px-2 transition-all flex items-center gap-2 ${
                  activeTab === 'terminal' 
                    ? 'border-cyan-500 text-cyan-400' 
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                📟 Terminal Console
              </button>
              <button 
                onClick={() => setActiveTab('vsystems')}
                className={`text-[10px] uppercase tracking-widest font-bold h-12 border-b-2 px-2 transition-all flex items-center gap-2.5 ${
                  activeTab === 'vsystems' 
                    ? 'border-cyan-500 text-cyan-400' 
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                🐳 Nested Hypervisor
                {vsystems.length > 0 && (
                  <span className="bg-cyan-500/10 text-cyan-400 text-[8px] px-1.5 py-0.5 rounded border border-cyan-500/30">
                    {vsystems.length}
                  </span>
                )}
              </button>
            </div>
            
            {activeTab === 'vsystems' && node.status === 'running' && (
              <button 
                onClick={() => setShowDeployVsysModal(true)}
                className="text-[9px] uppercase tracking-widest font-bold border border-cyan-500 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-500 hover:text-black px-4 py-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)]"
              >
                + Deploy Container
              </button>
            )}
          </div>

          {activeTab === 'terminal' ? (
            /* TAB 1: Terminal TTY Console */
            <div className="flex-1 p-6 flex flex-col overflow-hidden relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1.5 pr-2 select-text scrollbar-thin">
                {terminalHistory.map((line, idx) => {
                  let colorClass = "text-slate-300";
                  if (line.startsWith('PS C:\\')) {
                    colorClass = "text-cyan-400 font-bold";
                  } else if (line.startsWith('[SYSTEM]')) {
                    colorClass = "text-emerald-400/90";
                  } else if (line.startsWith('[DOCKER]')) {
                    colorClass = "text-cyan-400/80";
                  } else if (line.startsWith('[ERROR]') || line.startsWith('ERROR:')) {
                    colorClass = "text-red-400 font-semibold";
                  } else if (line.startsWith('Connected to') || line.startsWith('Virtualizing Node:')) {
                    colorClass = "text-slate-400 italic";
                  }
                  
                  return (
                    <div key={idx} className={`whitespace-pre-wrap ${colorClass}`}>
                      {line}
                    </div>
                  );
                })}
                
                {node.status === 'running' ? (
                  <form onSubmit={handleTerminalSubmit} className="flex pt-2 items-center">
                    <span className="text-cyan-400 font-bold mr-2 whitespace-nowrap">{`PS C:\\Nexus\\Node-${node.name}>`}</span>
                    <input 
                      type="text" 
                      autoFocus 
                      value={terminalInput} 
                      onChange={(e) => setTerminalInput(e.target.value)} 
                      className="flex-1 bg-transparent text-white outline-none caret-cyan-400 border-none p-0 focus:ring-0" 
                      spellCheck="false" 
                      autoComplete="off"
                    />
                  </form>
                ) : (
                  <div className="text-red-500 pt-5 font-bold uppercase tracking-widest">// HANDSHAKE_REFUSED: Compute node is powered off.</div>
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>
          ) : (
            /* TAB 2: Nested Virtual Systems List */
            <div className="flex-1 p-6 overflow-y-auto scrollbar-thin relative z-10 space-y-6">
              
              <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-slate-900 pb-4">
                <div>
                  <h3 className="text-white font-bold text-sm tracking-widest uppercase">// Nested_Virtualization_Matrix</h3>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Deploy and monitor isolated sandboxes inside this hypervisor node.</p>
                </div>
              </div>

              {loadingVsys ? (
                <div className="text-slate-500 text-center py-10 tracking-widest animate-pulse text-[10px]">
                  // SCANNING_NESTED_ALLOCATION_TABLES...
                </div>
              ) : vsystems.length === 0 ? (
                <div className="border border-dashed border-slate-800 rounded py-16 flex flex-col items-center justify-center text-slate-500 bg-[#02050f]/20">
                  <div className="text-2xl mb-3">📦</div>
                  <p className="text-[10px] font-bold text-white uppercase tracking-widest">No nested systems active on host</p>
                  {node.status === 'running' ? (
                    <button 
                      onClick={() => setShowDeployVsysModal(true)} 
                      className="mt-4 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 px-4 py-1.5 text-[9px] uppercase tracking-wider bg-cyan-950/10"
                    >
                      Provision First Container
                    </button>
                  ) : (
                    <p className="text-[9px] mt-2 uppercase tracking-widest text-red-500/60">// Power on instance node to enable virtualization engine.</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vsystems.map((vs) => (
                    <div 
                      key={vs.id} 
                      className="bg-[#040816]/75 border border-slate-850 hover:border-cyan-500/25 p-5 rounded flex flex-col justify-between transition-colors shadow-lg"
                    >
                      <div>
                        {/* Header details */}
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">{vs.name}</h4>
                            <div className="text-[8px] text-slate-500 font-mono mt-0.5 uppercase tracking-widest">ID: {vs.id} | image: {vs.image}</div>
                          </div>
                          
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase border ${
                            vs.status === 'running' 
                              ? 'bg-emerald-950/10 border-emerald-500/40 text-emerald-400' 
                              : 'bg-slate-900 border-slate-800 text-slate-500'
                          }`}>
                            {vs.status}
                          </span>
                        </div>

                        {/* Metric Tracks */}
                        <div className="space-y-3 font-mono text-[9px] mb-6">
                          {/* CPU Gauge */}
                          <div>
                            <div className="flex justify-between text-slate-500 mb-1 uppercase tracking-widest">
                              <span>Allocated CPU</span>
                              <span className={vs.status === 'running' ? "text-cyan-400 font-bold" : ""}>
                                {vs.status === 'running' ? `${vs.cpu_usage}%` : '0%'}
                              </span>
                            </div>
                            <div className="h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                              <div 
                                className="h-full bg-cyan-400 shadow-[0_0_4px_#22d3ee] transition-all duration-1000"
                                style={{ width: vs.status === 'running' ? `${vs.cpu_usage * 8}%` : '0%' }}
                              ></div>
                            </div>
                          </div>

                          {/* Memory Gauge */}
                          <div>
                            <div className="flex justify-between text-slate-500 mb-1 uppercase tracking-widest">
                              <span>Allocated MEMORY</span>
                              <span className={vs.status === 'running' ? "text-purple-400 font-bold" : ""}>
                                {vs.status === 'running' ? `${vs.memory_usage} MB` : '0 MB'}
                              </span>
                            </div>
                            <div className="h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                              <div 
                                className="h-full bg-purple-500 shadow-[0_0_4px_#a855f7] transition-all duration-1000"
                                style={{ width: vs.status === 'running' ? `${(vs.memory_usage / 512) * 100}%` : '0%' }}
                              ></div>
                            </div>
                          </div>

                          {/* Port Forwarding */}
                          <div className="flex justify-between border-t border-slate-900/60 pt-2 text-[9px]">
                            <span className="text-slate-500 uppercase tracking-widest">System Interface Port</span>
                            <span className="text-slate-300 font-mono">{vs.port_mapping || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Operations */}
                      <div className="grid grid-cols-2 gap-2 border-t border-slate-900/60 pt-3">
                        <button 
                          onClick={() => handleToggleVsysPower(vs.id, vs.name, vs.status)}
                          className="py-1.5 text-[8px] uppercase tracking-widest font-bold border border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white transition-all bg-[#010309]/50 rounded"
                        >
                          {vs.status === 'running' ? 'Stop' : 'Start'}
                        </button>
                        <button 
                          onClick={() => handleTerminateVsys(vs.id, vs.name)}
                          className="py-1.5 text-[8px] uppercase tracking-widest font-bold border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-black transition-all rounded"
                        >
                          Purge
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= DEPLOY CONTAINER MODAL ================= */}
      {showDeployVsysModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 relative">
          <div className="absolute inset-0 bg-[#030712]/30 pointer-events-none"></div>
          
          <div className="max-w-md w-full bg-[#080d22]/95 border border-cyan-500/30 rounded shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden relative z-10 font-mono">
            <div className="px-6 py-4 border-b border-slate-800/80 bg-[#040817] flex justify-between items-center">
              <h2 className="text-xs font-bold text-white tracking-widest uppercase">// VIRTUAL_SYSTEM_LAUNCHER</h2>
              <button onClick={() => setShowDeployVsysModal(false)} className="text-slate-500 hover:text-white text-xs">
                [X]
              </button>
            </div>
            
            <form onSubmit={handleDeployVsys} className="p-6 space-y-5">
              <div>
                <label className="block text-[8px] tracking-widest text-cyan-400 uppercase mb-2">
                  // Virtual System Name
                </label>
                <input 
                  type="text" 
                  required 
                  value={deployVsysParams.name} 
                  onChange={(e) => setDeployVsysParams({...deployVsysParams, name: e.target.value})}
                  className="w-full bg-[#02050f]/80 border border-slate-800 focus:border-cyan-500 focus:outline-none px-3 py-2 text-xs text-white placeholder:text-slate-700/60 rounded font-mono"
                  placeholder="nginx-ingress"
                />
              </div>

              <div>
                <label className="block text-[8px] tracking-widest text-cyan-400 uppercase mb-2">
                  // Core Template Blueprint
                </label>
                <select 
                  value={deployVsysParams.template} 
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full bg-[#02050f]/80 border border-slate-800 focus:border-cyan-500 focus:outline-none px-3 py-2 text-xs text-white rounded bg-black font-mono"
                >
                  <option value="nginx">Nginx Reverse Proxy (Web Server - Port 80)</option>
                  <option value="postgres">PostgreSQL Database (Datastore - Port 5432)</option>
                  <option value="redis">Redis Cache Node (In-Memory Key/Value - Port 6379)</option>
                  <option value="node">Node.js Microservice Server (Application - Port 3000)</option>
                  <option value="python">Python Flask Server (Daemon - Port 5000)</option>
                </select>
              </div>

              {/* Readonly details automatically filled by templates */}
              <div className="grid grid-cols-2 gap-4 bg-black/40 border border-slate-900 p-4 rounded text-[9px] font-mono text-slate-400 space-y-2">
                <div className="col-span-2 text-[8px] text-slate-500 uppercase tracking-widest">// Blueprint Parameters</div>
                
                <div>
                  <span className="block text-slate-600 uppercase text-[8px]">Category</span>
                  <span className="text-white">{deployVsysParams.system_type}</span>
                </div>
                <div>
                  <span className="block text-slate-600 uppercase text-[8px]">Image Version</span>
                  <span className="text-white">{deployVsysParams.image}</span>
                </div>
                <div className="col-span-2 pt-1.5 border-t border-slate-900/60">
                  <span className="block text-slate-600 uppercase text-[8px]">Port Forwarding Map</span>
                  <span className="text-cyan-400">{deployVsysParams.port_mapping}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowDeployVsysModal(false)} 
                  className="flex-1 py-2 border border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-widest hover:border-slate-600 transition-all rounded"
                >
                  [ Cancel ]
                </button>
                <button 
                  type="submit" 
                  disabled={isDeployingVsys} 
                  className="flex-1 py-2 bg-cyan-500 border border-cyan-400 text-black text-xs font-bold uppercase tracking-widest hover:bg-cyan-400 disabled:opacity-40 transition-all rounded"
                >
                  {isDeployingVsys ? 'PROVISIONING...' : 'DEPLOY_SYSTEM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}