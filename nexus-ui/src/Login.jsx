import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [mfaStage, setMfaStage] = useState(false);
  const [mfaCode, setMfaCode] = useState(['', '', '', '', '', '']);
  const [tempToken, setTempToken] = useState(null);
  const [logs, setLogs] = useState([]);
  
  const [region, setRegion] = useState('us-east-1');
  const regions = ['us-east-1', 'eu-central-1', 'ap-south-1'];
  
  const cardRef = useRef(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  
  const navigate = useNavigate();
  const API_URL = 'http://127.0.0.1:8000/api/v1/auth';

  useEffect(() => {
    const bootSequence = [
      "INITIATING NEXUS KERNEL v4.9.1...",
      "BYPASSING STANDARD PROTOCOLS...",
      "ESTABLISHING SECURE UPLINK TO AWS-CORE...",
      "DECRYPTING HANDSHAKE...",
      "UPLINK SECURED. AWAITING COMMAND AUTHORIZATION."
    ];
    
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < bootSequence.length) {
        setLogs(prev => [...prev, bootSequence[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 800);
    
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotation({ x: (y / (rect.height / 2)) * -10, y: (x / (rect.width / 2)) * 10 });
  };

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        const response = await axios.post(`${API_URL}/login`, formData);
        setTempToken(response.data.access_token);
        setMfaStage(true);
      } else {
        await axios.post(`${API_URL}/register`, { email, password });
        setIsLogin(true);
        alert("Account created! 10,000 tokens credited. Please log in.");
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('nexus_token', tempToken);
      navigate('/console');
    }, 1200);
  };

  const handleMfaInput = (index, value) => {
    if (value.length > 1) return;
    const newCode = [...mfaCode];
    newCode[index] = value;
    setMfaCode(newCode);
    if (value && index < 5) {
      const nextInput = document.getElementById(`mfa-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col lg:flex-row font-mono text-slate-300 selection:bg-cyan-500/30 overflow-hidden">
      
      {/* ================= LEFT WING ================= */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 border-r border-cyan-500/20 bg-[#02040a]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_100%_100%_at_0%_50%,#000_40%,transparent_100%)]"></div>
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none animate-[pulse_6s_ease-in-out_infinite]"></div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 flex items-center justify-center">
            <div className="w-2 h-2 bg-cyan-400 animate-ping"></div>
          </div>
          <span className="text-cyan-500 font-bold tracking-widest text-sm">GLOBAL_ORCHESTRATION</span>
        </div>

        <div className="relative z-10 mb-10">
          <h1 className="text-6xl xl:text-7xl font-bold text-white tracking-tighter drop-shadow-[0_0_15px_rgba(6,182,212,0.3)] mb-6">
            NEXUS<span className="text-cyan-500">_OS</span>
          </h1>
          
          <div className="mt-8 bg-black/50 border border-cyan-500/30 p-4 rounded-lg h-48 w-full max-w-lg font-mono text-xs overflow-y-auto">
            <div className="flex gap-2 mb-4 border-b border-cyan-500/20 pb-2">
              <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
            </div>
            {logs.map((log, i) => (
              <div key={i} className="mb-2 text-cyan-400/80">
                <span className="text-slate-500 mr-2">[{new Date().toISOString().split('T')[1].slice(0,8)}]</span>
                {log}
              </div>
            ))}
            <div className="animate-pulse text-cyan-500">_</div>
          </div>
        </div>
      </div>

      {/* ================= RIGHT WING ================= */}
      <div className="w-full lg:w-1/2 relative flex items-center justify-center p-6 lg:p-12">
        <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div 
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => { setIsHovering(false); setRotation({ x: 0, y: 0 }); }}
          style={{ transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(${isHovering ? 1.02 : 1}, ${isHovering ? 1.02 : 1}, 1)`, transition: isHovering ? 'transform 0.1s ease-out' : 'transform 0.5s ease-out' }}
          className="relative max-w-sm w-full bg-[#0a1128]/80 backdrop-blur-2xl rounded-xl p-8 border-y border-cyan-500/30 border-x border-cyan-500/10 z-10 shadow-[0_0_40px_rgba(6,182,212,0.1)] transform-gpu"
        >
          <div className="flex justify-between items-start mb-8 relative">
            <div>
              <h2 className="text-xl font-bold text-white tracking-widest">
                {mfaStage ? 'SECURITY_CHECK' : `AUTH_PORTAL`}
              </h2>
              <div className="flex items-center gap-2 text-cyan-400/80 text-[9px] tracking-[0.2em] uppercase mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping"></span>
                {mfaStage ? 'AWAITING_BIOMETRICS' : 'CLEARANCE_REQUIRED'}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border-l-2 border-red-500 text-red-400 p-2 mb-4 text-[10px] flex items-center gap-2">
              <span className="text-red-500">⚠</span> {error}
            </div>
          )}

          {!mfaStage ? (
            <form onSubmit={handleInitialSubmit} className="space-y-6">
              
              <div>
                 <label className="block text-[9px] tracking-widest text-cyan-500/70 mb-2 uppercase">
                  // Core_Routing_Node
                </label>
                <div className="flex gap-2">
                  {regions.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRegion(r)}
                      className={`flex-1 py-1.5 text-[9px] tracking-wider uppercase border transition-colors ${
                        region === r ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-black/40 border-slate-700/50 text-slate-500 hover:border-cyan-500/50 hover:text-cyan-400'
                      }`}
                    >
                      {r.split('-')[1]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="group">
                <label className="block text-[9px] tracking-widest text-cyan-500/70 uppercase group-focus-within:text-cyan-400 transition-colors">
                  // COMMAND_IDENTITY
                </label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border-b border-slate-700 focus:border-cyan-500 px-3 py-2 text-sm text-cyan-50 focus:outline-none transition-all placeholder:text-slate-700/50 focus:bg-cyan-950/20 mt-1"
                  placeholder="operative@nexus.cloud"
                />
                {/* Micro-copy information */}
                <div className="text-[7px] text-cyan-500/40 mt-1.5 uppercase tracking-widest">Federated via Nexus IAM Server</div>
              </div>
              
              <div className="group">
                <div className="flex justify-between items-end">
                  <label className="block text-[9px] tracking-widest text-cyan-500/70 uppercase group-focus-within:text-cyan-400 transition-colors">
                    // ZERO_TRUST_CIPHER
                  </label>
                  {isLogin && (
                    <span className="text-[7px] text-slate-500 hover:text-cyan-400 cursor-pointer transition-colors uppercase tracking-widest">
                      [ RECOVER_CIPHER ]
                    </span>
                  )}
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border-b border-slate-700 focus:border-cyan-500 px-3 py-2 text-sm text-cyan-50 focus:outline-none transition-all placeholder:text-slate-700/50 focus:bg-cyan-950/20 mt-1"
                  placeholder="••••••••"
                />
                {/* Micro-copy information */}
                <div className="text-[7px] text-cyan-500/40 mt-1.5 uppercase tracking-widest">AES-256 Protocol Enforced</div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full relative overflow-hidden bg-cyan-500/10 border border-cyan-500/50 hover:bg-cyan-500 hover:text-black text-cyan-400 font-bold py-3 transition-all duration-300 disabled:opacity-50 mt-6 group"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-in-out"></div>
                <span className="relative z-10 flex items-center justify-center gap-2 tracking-[0.2em] text-[10px]">
                  {loading ? 'NEGOTIATING HANDSHAKE...' : (isLogin ? 'ESTABLISH_SECURE_UPLINK' : 'MINT_NEW_CREDENTIALS')}
                </span>
              </button>

              {isLogin && (
                <div className="pt-4 border-t border-slate-800 mt-4 flex gap-2">
                  <button type="button" className="flex-1 py-2 bg-[#161b22] border border-slate-700 hover:border-slate-500 text-slate-300 text-[9px] tracking-widest flex items-center justify-center gap-2 transition-colors">
                    <span>GITHUB_SSO</span>
                  </button>
                  <button type="button" className="flex-1 py-2 bg-slate-900 border border-slate-700 hover:border-cyan-500 hover:text-cyan-400 text-slate-400 text-[9px] tracking-widest transition-colors">
                    SAML/OKTA
                  </button>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit} className="space-y-6">
              <div className="text-center text-xs text-cyan-500/80 mb-6">
                Transmission encrypted. Please enter your 6-digit authorization sequence to decrypt payload.
              </div>
              <div className="flex gap-2 justify-center">
                {mfaCode.map((digit, i) => (
                  <input
                    key={i} id={`mfa-${i}`} type="text" value={digit}
                    onChange={(e) => handleMfaInput(i, e.target.value)}
                    className="w-10 h-12 bg-black/40 border border-cyan-500/30 text-center text-lg text-cyan-400 focus:border-cyan-400 focus:bg-cyan-900/20 focus:outline-none rounded-sm transition-all"
                  />
                ))}
              </div>
              <button type="submit" disabled={loading || mfaCode.join('').length !== 6} className="w-full relative overflow-hidden bg-emerald-500/10 border border-emerald-500/50 hover:bg-emerald-500 hover:text-black text-emerald-400 font-bold py-3 transition-all duration-300 disabled:opacity-50 mt-6 group">
                <span className="relative z-10 flex items-center justify-center gap-2 tracking-[0.2em] text-xs">
                  {loading ? 'VERIFYING SIGNATURE...' : 'DECRYPT & ENTER'}
                </span>
              </button>
              <div className="text-center">
                <button type="button" onClick={() => setMfaStage(false)} className="text-[9px] text-slate-500 hover:text-red-400 transition-colors tracking-widest">
                  [ ABORT_SEQUENCE ]
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center flex justify-between items-center border-t border-cyan-500/20 pt-4">
             <span className="text-[8px] text-slate-600 tracking-widest">v1.0.42</span>
             {!mfaStage && (
               <button onClick={() => setIsLogin(!isLogin)} type="button" className="text-[8px] text-slate-400 hover:text-cyan-400 transition-colors tracking-widest">
                {isLogin ? "[ INITIATE_NEW_OPERATIVE ]" : "[ RETURN_TO_AUTH ]"}
              </button>
             )}
          </div>
          
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/50"></div>
          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/50"></div>
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/50"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/50"></div>
        </div>
      </div>
    </div>
  );
}