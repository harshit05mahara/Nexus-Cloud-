import { useNavigate } from 'react-router-dom';

export default function PublicDashboard() {
  const navigate = useNavigate();

  // The "Delayed Auth" Interceptor
  const handleServiceAccess = (serviceName) => {
    const token = localStorage.getItem('nexus_token');
    if (token) {
      // If they already have a token, let them straight into the console
      navigate('/console');
    } else {
      // If no token, intercept them and send them to the Auth Portal
      navigate('/login');
    }
  };

  const services = [
    {
      id: 'compute',
      name: 'Nexus Compute Engine',
      description: 'Deploy scalable virtual machines with GPU acceleration.',
      icon: '⚡',
      color: 'border-cyan-500/50 text-cyan-400',
      bg: 'hover:bg-cyan-500/10'
    },
    {
      id: 'database',
      name: 'Relational DB Service',
      description: 'Managed PostgreSQL and MySQL instances with automated backups.',
      icon: '🗄️',
      color: 'border-emerald-500/50 text-emerald-400',
      bg: 'hover:bg-emerald-500/10'
    },
    {
      id: 'storage',
      name: 'Object Storage Buckets',
      description: 'Highly durable cloud storage for massive data lakes.',
      icon: '📦',
      color: 'border-amber-500/50 text-amber-400',
      bg: 'hover:bg-amber-500/10'
    },
    {
      id: 'network',
      name: 'Virtual Private Cloud',
      description: 'Isolated network enclosures, firewalls, and subnets.',
      icon: '🌐',
      color: 'border-purple-500/50 text-purple-400',
      bg: 'hover:bg-purple-500/10'
    }
  ];

  return (
    <div className="min-h-screen bg-[#030712] font-mono flex flex-col relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      {/* Top Navigation */}
      <nav className="h-20 border-b border-cyan-500/20 bg-black/40 backdrop-blur-md flex items-center justify-between px-10 relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-cyan-400 animate-pulse"></div>
          <h1 className="text-2xl font-bold text-white tracking-[0.2em] drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
            NEXUS<span className="text-cyan-500">_OS</span>
          </h1>
        </div>
        <button 
          onClick={() => handleServiceAccess()}
          className="px-6 py-2 border border-cyan-500/50 text-cyan-400 text-xs tracking-widest uppercase hover:bg-cyan-500 hover:text-black transition-all"
        >
          Access Console
        </button>
      </nav>

      {/* Main Hero & Grid */}
      <main className="flex-1 flex flex-col items-center justify-center p-10 relative z-10">
        <div className="text-center mb-16 max-w-3xl">
          <h2 className="text-5xl font-bold text-white tracking-tight mb-6">
            The Infrastructure <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
              For The Next Generation
            </span>
          </h2>
          <p className="text-slate-400 text-sm tracking-widest uppercase leading-relaxed">
            Select a service domain below to initiate deployment protocols. 
            Authorization clearance will be requested upon entry.
          </p>
        </div>

        {/* The Front Four Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {services.map((svc) => (
            <div 
              key={svc.id}
              onClick={() => handleServiceAccess(svc.id)}
              className={`bg-[#0a1128]/80 backdrop-blur-xl border border-slate-800 p-8 cursor-pointer transition-all duration-300 group hover:-translate-y-1 hover:border-cyan-500/50 shadow-[0_0_0_rgba(0,0,0,0)] hover:shadow-[0_10px_40px_rgba(6,182,212,0.1)] ${svc.bg}`}
            >
              <div className={`w-12 h-12 flex items-center justify-center text-2xl border mb-6 transition-colors ${svc.color} group-hover:bg-black/50`}>
                {svc.icon}
              </div>
              <h3 className="text-white text-lg tracking-widest font-bold mb-2 uppercase">{svc.name}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{svc.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}