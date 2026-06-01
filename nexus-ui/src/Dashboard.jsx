import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('compute');
  
  // Real-time State 
  const [liveWallet, setLiveWallet] = useState(10000);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Compute Deployment Modal State
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployParams, setDeployParams] = useState({ name: '', instance_type: 't3.medium', region: 'us-east-1' });
  const [isDeploying, setIsDeploying] = useState(false);

  // Databases States
  const [databases, setDatabases] = useState([]);
  const [showDeployDBModal, setShowDeployDBModal] = useState(false);
  const [deployDBParams, setDeployDBParams] = useState({ name: '', db_engine: 'postgresql', version: '15', region: 'us-east-1', size_gb: 20 });
  const [isDeployingDB, setIsDeployingDB] = useState(false);
  const [selectedDBConnStr, setSelectedDBConnStr] = useState(null);

  // Storage Buckets States
  const [buckets, setBuckets] = useState([]);
  const [showDeployBucketModal, setShowDeployBucketModal] = useState(false);
  const [deployBucketParams, setDeployBucketParams] = useState({ name: '', storage_class: 'STANDARD', region: 'us-east-1' });
  const [isDeployingBucket, setIsDeployingBucket] = useState(false);
  const [activeBucketDetails, setActiveBucketDetails] = useState(null);
  const [bucketFiles, setBucketFiles] = useState({});
  const [newFileName, setNewFileName] = useState('');
  const [newFileSize, setNewFileSize] = useState(5);

  // VPC States
  const [vpcs, setVpcs] = useState([]);
  const [showDeployVPCModal, setShowDeployVPCModal] = useState(false);
  const [deployVPCParams, setDeployVPCParams] = useState({ name: '', cidr_block: '10.0.0.0/16', region: 'us-east-1' });
  const [isDeployingVPC, setIsDeployingVPC] = useState(false);

  const INSTANCES_URL = 'http://127.0.0.1:8000/api/v1/instances';
  const DATABASES_URL = 'http://127.0.0.1:8000/api/v1/databases';
  const STORAGE_URL = 'http://127.0.0.1:8000/api/v1/storage';
  const NETWORK_URL = 'http://127.0.0.1:8000/api/v1/network';

  // 1. Security Check & Initial Data Sync
  useEffect(() => {
    const token = localStorage.getItem('nexus_token');
    if (!token) {
      navigate('/');
      return;
    }
    fetchAllResources();
  }, [navigate]);

  // 2. Live Telemetry Balance Stream
  useEffect(() => {
    const token = localStorage.getItem('nexus_token');
    if (!token) return;
    
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/telemetry?token=${token}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.wallet_balance !== undefined) {
        setLiveWallet(data.wallet_balance);
      }
    };
    
    ws.onerror = (err) => {
      console.error("Telemetry WebSocket error:", err);
    };

    return () => ws.close();
  }, []);

  const fetchAllResources = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchInstances(),
        fetchDatabases(),
        fetchBuckets(),
        fetchVPCs()
      ]);
    } catch (err) {
      console.error("Error fetching infrastructure sync details: ", err);
    } finally {
      setLoading(false);
    }
  };

  // 3. API Transaction Operations

  // ================= COMPUTE OPERATIONS =================
  const fetchInstances = async () => {
    try {
      const token = localStorage.getItem('nexus_token'); 
      const response = await axios.get(INSTANCES_URL, { headers: { Authorization: `Bearer ${token}` } });
      setInstances(response.data.data);
    } catch (err) {
      setError('Authentication rejected. Unable to pull compute records.');
    }
  };

  const handleDeploy = async (e) => {
    e.preventDefault();
    setIsDeploying(true);
    setError('');
    try {
      const token = localStorage.getItem('nexus_token'); 
      await axios.post(`${INSTANCES_URL}/deploy`, deployParams, { headers: { Authorization: `Bearer ${token}` } });
      await fetchInstances(); 
      setShowDeployModal(false); 
      setDeployParams({ name: '', instance_type: 't3.medium', region: 'us-east-1' });
    } catch (err) {
      setError('Deployment allocation transaction rejected by control plane.');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleTogglePower = async (instanceId) => {
    try {
      const token = localStorage.getItem('nexus_token');
      await axios.put(`${INSTANCES_URL}/${instanceId}/toggle`, {}, { headers: { Authorization: `Bearer ${token}` } });
      await fetchInstances(); 
    } catch (err) {
      setError('Compute state change rejected by core control plane.');
    }
  };

  const handleTerminate = async (instanceId) => {
    try {
      const token = localStorage.getItem('nexus_token');
      await axios.delete(`${INSTANCES_URL}/${instanceId}`, { headers: { Authorization: `Bearer ${token}` } });
      await fetchInstances(); 
    } catch (err) {
      setError('Termination protocol sequence aborted by security layer.');
    }
  };

  // ================= DATABASE RDS OPERATIONS =================
  const fetchDatabases = async () => {
    try {
      const token = localStorage.getItem('nexus_token'); 
      const response = await axios.get(DATABASES_URL, { headers: { Authorization: `Bearer ${token}` } });
      setDatabases(response.data.data);
    } catch (err) {
      setError('Authentication rejected. Unable to pull database records.');
    }
  };

  const handleDeployDB = async (e) => {
    e.preventDefault();
    setIsDeployingDB(true);
    setError('');
    try {
      const token = localStorage.getItem('nexus_token'); 
      await axios.post(`${DATABASES_URL}/deploy`, deployDBParams, { headers: { Authorization: `Bearer ${token}` } });
      await fetchDatabases(); 
      setShowDeployDBModal(false); 
      setDeployDBParams({ name: '', db_engine: 'postgresql', version: '15', region: 'us-east-1', size_gb: 20 });
    } catch (err) {
      setError('Database deployment rejected by control plane.');
    } finally {
      setIsDeployingDB(false);
    }
  };

  const handleToggleDBPower = async (dbId) => {
    try {
      const token = localStorage.getItem('nexus_token');
      await axios.put(`${DATABASES_URL}/${dbId}/toggle`, {}, { headers: { Authorization: `Bearer ${token}` } });
      await fetchDatabases(); 
    } catch (err) {
      setError('Database power mutation transaction rejected.');
    }
  };

  const handleTerminateDB = async (dbId) => {
    try {
      const token = localStorage.getItem('nexus_token');
      await axios.delete(`${DATABASES_URL}/${dbId}`, { headers: { Authorization: `Bearer ${token}` } });
      await fetchDatabases(); 
    } catch (err) {
      setError('Database purge protocol sequence aborted.');
    }
  };

  // ================= STORAGE BUCKET OPERATIONS =================
  const fetchBuckets = async () => {
    try {
      const token = localStorage.getItem('nexus_token'); 
      const response = await axios.get(STORAGE_URL, { headers: { Authorization: `Bearer ${token}` } });
      setBuckets(response.data.data);
    } catch (err) {
      setError('Authentication rejected. Unable to pull storage vaults.');
    }
  };

  const handleDeployBucket = async (e) => {
    e.preventDefault();
    setIsDeployingBucket(true);
    setError('');
    try {
      const token = localStorage.getItem('nexus_token'); 
      await axios.post(`${STORAGE_URL}/create`, deployBucketParams, { headers: { Authorization: `Bearer ${token}` } });
      await fetchBuckets(); 
      setShowDeployBucketModal(false); 
      setDeployBucketParams({ name: '', storage_class: 'STANDARD', region: 'us-east-1' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Bucket deployment rejected by control plane.');
    } finally {
      setIsDeployingBucket(false);
    }
  };

  const handleDeleteBucket = async (bucketId) => {
    try {
      const token = localStorage.getItem('nexus_token');
      await axios.delete(`${STORAGE_URL}/${bucketId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (activeBucketDetails?.id === bucketId) setActiveBucketDetails(null);
      await fetchBuckets(); 
    } catch (err) {
      setError('Storage vault purge rejected by core control plane.');
    }
  };

  const handleAddMockFile = async (bucket) => {
    if (!newFileName.trim()) return;
    const currentFiles = bucketFiles[bucket.id] || [];
    const newFiles = [...currentFiles, { name: newFileName.trim(), size: newFileSize }];
    const newSizeGb = newFiles.reduce((acc, f) => acc + f.size, 0);
    
    try {
      const token = localStorage.getItem('nexus_token');
      await axios.put(`${STORAGE_URL}/${bucket.id}/resize`, { size_gb: newSizeGb }, { headers: { Authorization: `Bearer ${token}` } });
      setBucketFiles({ ...bucketFiles, [bucket.id]: newFiles });
      setNewFileName('');
      setNewFileSize(5);
      await fetchBuckets();
      setActiveBucketDetails(prev => ({ ...prev, size_gb: newSizeGb }));
    } catch (err) {
      setError('Failed to allocate payload inside object vault storage.');
    }
  };

  const handleRemoveMockFile = async (bucket, fileIndex) => {
    const currentFiles = bucketFiles[bucket.id] || [];
    const newFiles = currentFiles.filter((_, idx) => idx !== fileIndex);
    const newSizeGb = newFiles.reduce((acc, f) => acc + f.size, 0);
    
    try {
      const token = localStorage.getItem('nexus_token');
      await axios.put(`${STORAGE_URL}/${bucket.id}/resize`, { size_gb: newSizeGb }, { headers: { Authorization: `Bearer ${token}` } });
      setBucketFiles({ ...bucketFiles, [bucket.id]: newFiles });
      await fetchBuckets();
      setActiveBucketDetails(prev => ({ ...prev, size_gb: newSizeGb }));
    } catch (err) {
      setError('Failed to deallocate payload from object vault.');
    }
  };

  // ================= VPC NETWORKING OPERATIONS =================
  const fetchVPCs = async () => {
    try {
      const token = localStorage.getItem('nexus_token'); 
      const response = await axios.get(NETWORK_URL, { headers: { Authorization: `Bearer ${token}` } });
      setVpcs(response.data.data);
    } catch (err) {
      setError('Authentication rejected. Unable to pull network VPC records.');
    }
  };

  const handleDeployVPC = async (e) => {
    e.preventDefault();
    setIsDeployingVPC(true);
    setError('');
    try {
      const token = localStorage.getItem('nexus_token'); 
      await axios.post(`${NETWORK_URL}/deploy`, deployVPCParams, { headers: { Authorization: `Bearer ${token}` } });
      await fetchVPCs(); 
      setShowDeployVPCModal(false); 
      setDeployVPCParams({ name: '', cidr_block: '10.0.0.0/16', region: 'us-east-1' });
    } catch (err) {
      setError(err.response?.data?.detail || 'VPC deployment rejected by control plane.');
    } finally {
      setIsDeployingVPC(false);
    }
  };

  const handleDeleteVPC = async (vpcId) => {
    try {
      const token = localStorage.getItem('nexus_token');
      await axios.delete(`${NETWORK_URL}/${vpcId}`, { headers: { Authorization: `Bearer ${token}` } });
      await fetchVPCs(); 
    } catch (err) {
      setError('VPC deletion rejected by core control plane.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nexus_token');
    navigate('/');
  };

  // Calculates combined burn rates of compute nodes + databases
  const currentBurnRate = 
    instances.reduce((acc, node) => node.status === 'running' ? acc + (node.cost_per_hour || 0) : acc, 0) +
    databases.reduce((acc, db) => db.status === 'running' ? acc + (db.cost_per_hour || 0) : acc, 0);

  // ================= TAB RENDER LAYOUTS =================

  const renderComputeTab = () => (
    <>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-10 border-b border-slate-800/80 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-widest uppercase flex items-center gap-2">
            <span className="w-1.5 h-4 bg-cyan-500"></span> Compute_Infrastructure
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 uppercase tracking-widest">// Virtualization hypervisors status and orchestration matrices.</p>
        </div>
        
        <button 
          onClick={() => setShowDeployModal(true)}
          className="border border-cyan-500 bg-cyan-950/10 text-cyan-400 hover:bg-cyan-500 hover:text-black shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all"
        >
          + Deploy_New_Node
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {instances.length === 0 ? (
          <div className="col-span-full bg-[#0a1128]/30 border border-dashed border-slate-800 rounded-lg py-20 flex flex-col items-center justify-center text-slate-500">
            <div className="text-3xl mb-4 animate-bounce">🖥️</div>
            <p className="text-xs font-bold text-white uppercase tracking-widest">No active virtual nodes deployed</p>
            <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">// Configure parameters and submit matrices to spin up servers.</p>
          </div>
        ) : (
          instances.map((node) => (
            <div 
              key={node.id} 
              className="bg-[#0a1128]/60 backdrop-blur-xl border border-slate-800 hover:border-cyan-500/30 transition-all duration-300 flex flex-col overflow-hidden rounded shadow-2xl group"
            >
              <div className={`h-0.5 w-full transition-colors duration-300 ${node.status === 'running' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'}`}></div>
              
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-widest uppercase group-hover:text-cyan-400 transition-colors">{node.name}</h3>
                    <div className="text-[9px] font-mono text-slate-500 mt-1 uppercase tracking-widest">// NODE_ID: {node.id.substring(0,8)}</div>
                  </div>
                  
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase border ${
                    node.status === 'running' 
                      ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-400' 
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}>
                    {node.status}
                  </span>
                </div>
                
                <div className="space-y-3.5 mb-2 font-mono text-xs">
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500 uppercase tracking-widest text-[9px]">Hardware Profile</span>
                    <span className="font-semibold text-slate-200">{node.instance_type}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500 uppercase tracking-widest text-[9px]">Uplink IPv4</span>
                    <span className="font-mono text-cyan-400">{node.ip_address}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500 uppercase tracking-widest text-[9px]">Drain Coefficient</span>
                    <span className="font-semibold text-amber-500">{node.cost_per_hour} TKN/hr</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#02050f]/80 border-t border-slate-850 p-4 grid grid-cols-3 gap-2">
                <button 
                  onClick={() => navigate(`/workspace/${node.id}`)} 
                  disabled={node.status !== 'running'}
                  className="text-[9px] tracking-widest font-bold uppercase text-center bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 rounded hover:bg-cyan-500 hover:text-black py-2.5 disabled:opacity-30 disabled:hover:bg-cyan-500/10 disabled:hover:text-cyan-400 transition-all"
                >
                  Console
                </button>
                <button 
                  onClick={() => handleTogglePower(node.id)}
                  className="text-[9px] tracking-widest font-bold uppercase bg-slate-900/60 border border-slate-800 text-slate-300 rounded hover:border-slate-600 py-2.5 transition-all"
                >
                  {node.status === 'running' ? 'Stop' : 'Start'}
                </button>
                <button 
                  onClick={() => handleTerminate(node.id)}
                  className="text-[9px] tracking-widest font-bold uppercase bg-red-950/10 border border-red-500/30 text-red-400 rounded hover:bg-red-500 hover:text-black py-2.5 transition-all"
                >
                  Purge
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  const renderDatabasesTab = () => (
    <>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-10 border-b border-slate-800/80 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-widest uppercase flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span> Database_RDS_Grid
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 uppercase tracking-widest">// Orchestrate managed relational and NoSQL database clusters.</p>
        </div>
        
        <button 
          onClick={() => setShowDeployDBModal(true)}
          className="border border-emerald-500 bg-emerald-950/10 text-emerald-400 hover:bg-emerald-500 hover:text-black shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all"
        >
          + Provision_DB_Cluster
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {databases.length === 0 ? (
          <div className="col-span-full bg-[#0a1128]/30 border border-dashed border-slate-800 rounded-lg py-20 flex flex-col items-center justify-center text-slate-500">
            <div className="text-3xl mb-4 animate-bounce">🗄️</div>
            <p className="text-xs font-bold text-white uppercase tracking-widest">No managed database nodes deployed</p>
            <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">// Spin up PostgreSQL or MySQL instances with fully managed metrics.</p>
          </div>
        ) : (
          databases.map((db) => (
            <div 
              key={db.id} 
              className="bg-[#0a1128]/60 backdrop-blur-xl border border-slate-800 hover:border-emerald-500/30 transition-all duration-300 flex flex-col overflow-hidden rounded shadow-2xl group"
            >
              <div className={`h-0.5 w-full transition-colors duration-300 ${db.status === 'running' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'}`}></div>
              
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-widest uppercase group-hover:text-emerald-400 transition-colors">{db.name}</h3>
                    <div className="text-[9px] font-mono text-slate-500 mt-1 uppercase tracking-widest">// CLUSTER_ID: {db.id.substring(0,11)}</div>
                  </div>
                  
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase border ${
                    db.status === 'running' 
                      ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-400' 
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}>
                    {db.status}
                  </span>
                </div>
                
                <div className="space-y-3.5 mb-2 font-mono text-xs">
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500 uppercase tracking-widest text-[9px]">DB Engine / Ver</span>
                    <span className="font-semibold text-slate-200 uppercase">{db.db_engine} v{db.version}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500 uppercase tracking-widest text-[9px]">Host Endpoint IP</span>
                    <span className="font-mono text-emerald-400">{db.ip_address}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500 uppercase tracking-widest text-[9px]">Allocated Disk Space</span>
                    <span className="font-semibold text-slate-200">{db.size_gb} GB</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500 uppercase tracking-widest text-[9px]">Hourly Drain Rate</span>
                    <span className="font-semibold text-amber-500">{db.cost_per_hour} TKN/hr</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#02050f]/80 border-t border-slate-850 p-4 grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setSelectedDBConnStr(`${db.db_engine}://${db.ip_address}:${db.db_engine === 'postgresql' ? '5432' : '3306'}/production`)}
                  disabled={db.status !== 'running'}
                  className="text-[9px] tracking-widest font-bold uppercase text-center bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 rounded hover:bg-emerald-500 hover:text-black py-2.5 disabled:opacity-30 disabled:hover:bg-emerald-500/10 disabled:hover:text-emerald-400 transition-all"
                >
                  Connect
                </button>
                <button 
                  onClick={() => handleToggleDBPower(db.id)}
                  className="text-[9px] tracking-widest font-bold uppercase bg-slate-900/60 border border-slate-800 text-slate-300 rounded hover:border-slate-600 py-2.5 transition-all"
                >
                  {db.status === 'running' ? 'Stop' : 'Start'}
                </button>
                <button 
                  onClick={() => handleTerminateDB(db.id)}
                  className="text-[9px] tracking-widest font-bold uppercase bg-red-950/10 border border-red-500/30 text-red-400 rounded hover:bg-red-500 hover:text-black py-2.5 transition-all"
                >
                  Purge
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  const renderStorageTab = () => (
    <>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-10 border-b border-slate-800/80 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-widest uppercase flex items-center gap-2">
            <span className="w-1.5 h-4 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span> Storage_Vault_Registry
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 uppercase tracking-widest">// Globally distributed block object vaults mapping endpoints.</p>
        </div>
        
        <button 
          onClick={() => setShowDeployBucketModal(true)}
          className="border border-amber-500 bg-amber-950/10 text-amber-400 hover:bg-amber-500 hover:text-black shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all"
        >
          + Initialize_Vault
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buckets.length === 0 ? (
          <div className="col-span-full bg-[#0a1128]/30 border border-dashed border-slate-800 rounded-lg py-20 flex flex-col items-center justify-center text-slate-500">
            <div className="text-3xl mb-4 animate-bounce">📦</div>
            <p className="text-xs font-bold text-white uppercase tracking-widest">No storage vaults initialized</p>
            <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">// Mount object buckets supporting standard, cold, and glacier classes.</p>
          </div>
        ) : (
          buckets.map((bucket) => (
            <div 
              key={bucket.id} 
              className="bg-[#0a1128]/60 backdrop-blur-xl border border-slate-800 hover:border-amber-500/30 transition-all duration-300 flex flex-col overflow-hidden rounded shadow-2xl group"
            >
              <div className="h-0.5 w-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></div>
              
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-widest uppercase group-hover:text-amber-400 transition-colors">{bucket.name}</h3>
                    <div className="text-[9px] font-mono text-slate-500 mt-1 uppercase tracking-widest">// VAULT_ID: {bucket.id}</div>
                  </div>
                  
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase border bg-amber-950/20 border-amber-500/50 text-amber-400">
                    {bucket.storage_class}
                  </span>
                </div>
                
                <div className="space-y-3.5 mb-2 font-mono text-xs">
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500 uppercase tracking-widest text-[9px]">Placement Region</span>
                    <span className="font-semibold text-slate-200">{bucket.region}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500 uppercase tracking-widest text-[9px]">Stored Capacity</span>
                    <span className="font-semibold text-amber-400">{bucket.size_gb} GB</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500 uppercase tracking-widest text-[9px]">Simulation Files</span>
                    <span className="font-mono text-slate-400">{(bucketFiles[bucket.id] || []).length} registered</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#02050f]/80 border-t border-slate-850 p-4 grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setActiveBucketDetails(bucket)}
                  className="text-[9px] tracking-widest font-bold uppercase text-center bg-amber-500/10 border border-amber-500/40 text-amber-400 rounded hover:bg-amber-500 hover:text-black py-2.5 transition-all"
                >
                  Explore / Upload
                </button>
                <button 
                  onClick={() => handleDeleteBucket(bucket.id)}
                  className="text-[9px] tracking-widest font-bold uppercase bg-red-950/10 border border-red-500/30 text-red-400 rounded hover:bg-red-500 hover:text-black py-2.5 transition-all"
                >
                  Purge Vault
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  const renderNetworkingTab = () => (
    <>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-10 border-b border-slate-800/80 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-widest uppercase flex items-center gap-2">
            <span className="w-1.5 h-4 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></span> Networking_Private_Grid
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 uppercase tracking-widest">// Subnet allocations, CIDR segments, and private security topologies.</p>
        </div>
        
        <button 
          onClick={() => setShowDeployVPCModal(true)}
          className="border border-purple-500 bg-purple-950/10 text-purple-400 hover:bg-purple-500 hover:text-black shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all"
        >
          + Provision_VPC_Grid
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vpcs.length === 0 ? (
          <div className="col-span-full bg-[#0a1128]/30 border border-dashed border-slate-800 rounded-lg py-20 flex flex-col items-center justify-center text-slate-500">
            <div className="text-3xl mb-4 animate-bounce">🌐</div>
            <p className="text-xs font-bold text-white uppercase tracking-widest">No active VPC grids partition</p>
            <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">// Define isolated network topologies inside region backbones.</p>
          </div>
        ) : (
          vpcs.map((vpc) => (
            <div 
              key={vpc.id} 
              className="bg-[#0a1128]/60 backdrop-blur-xl border border-slate-800 hover:border-purple-500/30 transition-all duration-300 flex flex-col overflow-hidden rounded shadow-2xl group"
            >
              <div className="h-0.5 w-full bg-purple-500 shadow-[0_0_8px_#a855f7]"></div>
              
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-widest uppercase group-hover:text-purple-400 transition-colors">{vpc.name}</h3>
                    <div className="text-[9px] font-mono text-slate-500 mt-1 uppercase tracking-widest">// VPC_ID: {vpc.id}</div>
                  </div>
                  
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase border bg-purple-950/20 border-purple-500/50 text-purple-400">
                    Active
                  </span>
                </div>
                
                <div className="space-y-3.5 mb-2 font-mono text-xs">
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500 uppercase tracking-widest text-[9px]">CIDR Network Block</span>
                    <span className="font-semibold text-cyan-400 font-mono">{vpc.cidr_block}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500 uppercase tracking-widest text-[9px]">Zone Region</span>
                    <span className="font-semibold text-slate-200">{vpc.region}</span>
                  </div>
                  <div className="flex flex-col border-t border-slate-900 pt-2 text-[9px] text-slate-500 uppercase">
                    <span className="mb-1">// Simulated Subnets</span>
                    <span className="font-mono text-slate-400">Public: {vpc.cidr_block.replace('.0.0/16', '.1.0/24')}</span>
                    <span className="font-mono text-slate-400">Private: {vpc.cidr_block.replace('.0.0/16', '.2.0/24')}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#02050f]/80 border-t border-slate-850 p-4">
                <button 
                  onClick={() => handleDeleteVPC(vpc.id)}
                  className="w-full text-[9px] tracking-widest font-bold uppercase bg-red-950/10 border border-red-500/30 text-red-400 rounded hover:bg-red-500 hover:text-black py-2.5 transition-all"
                >
                  Deprovision Network
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'compute':
        return renderComputeTab();
      case 'databases':
        return renderDatabasesTab();
      case 'storage':
        return renderStorageTab();
      case 'networking':
        return renderNetworkingTab();
      default:
        return renderComputeTab();
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-300 font-mono relative overflow-hidden flex flex-col">
      {/* Background Matrix Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      
      {/* Dynamic Cyber Glow Elements */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-cyan-950/10 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-purple-950/10 rounded-full blur-[130px] pointer-events-none"></div>

      {/* ================= TOP NAVIGATION ================= */}
      <nav className="border-b border-cyan-500/20 bg-[#02040a]/80 backdrop-blur-md sticky top-0 z-30 relative z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 bg-cyan-400 animate-pulse"></div>
              <h1 className="text-xl font-bold tracking-[0.15em] text-white">
                NEXUS<span className="text-cyan-500">_OS</span>
              </h1>
            </div>
            
            <div className="hidden md:flex gap-6">
              {['Compute', 'Databases', 'Storage', 'Networking'].map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`text-[11px] uppercase tracking-wider transition-all relative py-5 ${
                    activeTab === tab.toLowerCase() 
                      ? 'text-cyan-400 font-bold' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab}
                  {activeTab === tab.toLowerCase() && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block border-r border-slate-800 pr-5">
              <div className="text-[8px] text-slate-500 uppercase tracking-widest mb-0.5">// Hourly_Drain</div>
              <div className="text-xs font-bold text-amber-500">
                {currentBurnRate} <span className="text-[9px] text-slate-500 font-normal">TKN/hr</span>
              </div>
            </div>
            <div className="text-right pr-2">
              <div className="text-[8px] text-slate-500 uppercase tracking-widest mb-0.5">// Secured_Wallet</div>
              <div className="text-xs font-bold text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.3)]">
                {liveWallet.toLocaleString()} <span className="text-[9px] text-slate-500 font-normal">TKN</span>
              </div>
            </div>
            
            <button 
              onClick={handleLogout} 
              className="text-[10px] uppercase tracking-widest border border-red-500/30 text-red-400 bg-red-950/10 px-4 py-2 hover:bg-red-500 hover:text-black transition-all"
            >
              [ Terminate_Session ]
            </button>
          </div>
        </div>
      </nav>

      {/* ================= MAIN MATRIX CONTENT ================= */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex-1 w-full relative z-10">
        {error && (
          <div className="bg-red-950/20 border border-red-500/50 p-4 mb-8 text-xs text-red-400 rounded-sm flex items-center gap-2">
            <span>⚠</span> {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-slate-500 text-xs tracking-widest animate-pulse">
            // SYNCING_ORCHESTRATION_METRIC_DATA_STREAM...
          </div>
        ) : (
          renderTabContent()
        )}
      </main>

      {/* ================= COMPUTE DEPLOYMENT MODAL ================= */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 relative">
          <div className="absolute inset-0 bg-[#030712]/30 pointer-events-none"></div>
          
          <div className="max-w-md w-full bg-[#080d22]/90 border border-cyan-500/30 rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden relative z-10 font-mono">
            <div className="px-6 py-4 border-b border-slate-800/80 bg-[#040817] flex justify-between items-center">
              <h2 className="text-xs font-bold text-white tracking-widest uppercase">// SECURE_LAUNCH_PARAMETERS</h2>
              <button onClick={() => setShowDeployModal(false)} className="text-slate-500 hover:text-white text-xs">
                [X]
              </button>
            </div>
            
            <form onSubmit={handleDeploy} className="p-6 space-y-5">
              <div>
                <label className="block text-[8px] tracking-widest text-cyan-400 uppercase mb-2">
                  // Core Node Identifier
                </label>
                <input 
                  type="text" 
                  required 
                  value={deployParams.name} 
                  onChange={(e) => setDeployParams({...deployParams, name: e.target.value})}
                  className="w-full bg-[#02050f]/80 border border-slate-800 focus:border-cyan-500 focus:outline-none px-3 py-2 text-xs text-white placeholder:text-slate-700/60 rounded"
                  placeholder="nexus-web-server-01"
                />
              </div>

              <div>
                <label className="block text-[8px] tracking-widest text-cyan-400 uppercase mb-2">
                  // Hypervisor Allocation Profile
                </label>
                <select 
                  value={deployParams.instance_type} 
                  onChange={(e) => setDeployParams({...deployParams, instance_type: e.target.value})}
                  className="w-full bg-[#02050f]/80 border border-slate-800 focus:border-cyan-500 focus:outline-none px-3 py-2 text-xs text-white rounded bg-black"
                >
                  <option value="t3.medium">t3.medium (General Purpose - 4 TKN/hr)</option>
                  <option value="c5.xlarge">c5.xlarge (Compute Optimized - 12 TKN/hr)</option>
                  <option value="g4dn.xlarge">g4dn.xlarge (GPU Accelerated - 35 TKN/hr)</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] tracking-widest text-cyan-400 uppercase mb-2">
                  // Grid Subnet Placement
                </label>
                <select 
                  value={deployParams.region} 
                  onChange={(e) => setDeployParams({...deployParams, region: e.target.value})}
                  className="w-full bg-[#02050f]/80 border border-slate-800 focus:border-cyan-500 focus:outline-none px-3 py-2 text-xs text-white rounded bg-black"
                >
                  <option value="us-east-1">us-east-1 (N. Virginia Core)</option>
                  <option value="eu-central-1">eu-central-1 (Frankfurt Core)</option>
                  <option value="ap-south-1">ap-south-1 (Mumbai Core)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowDeployModal(false)} 
                  className="flex-1 py-2.5 border border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-widest hover:border-slate-600 transition-all rounded"
                >
                  [ Cancel ]
                </button>
                <button 
                  type="submit" 
                  disabled={isDeploying} 
                  className="flex-1 py-2.5 bg-cyan-500 border border-cyan-400 text-black text-xs font-bold uppercase tracking-widest hover:bg-cyan-400 disabled:opacity-40 transition-all rounded"
                >
                  {isDeploying ? 'ALLOCATING...' : 'LAUNCH_NODE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DATABASE DEPLOYMENT MODAL ================= */}
      {showDeployDBModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 relative">
          <div className="absolute inset-0 bg-[#030712]/30 pointer-events-none"></div>
          
          <div className="max-w-md w-full bg-[#080d22]/90 border border-emerald-500/30 rounded-lg shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden relative z-10 font-mono">
            <div className="px-6 py-4 border-b border-slate-800/80 bg-[#040817] flex justify-between items-center">
              <h2 className="text-xs font-bold text-white tracking-widest uppercase">// DEPLOY_RDS_CLUSTER_PARAMS</h2>
              <button onClick={() => setShowDeployDBModal(false)} className="text-slate-500 hover:text-white text-xs">
                [X]
              </button>
            </div>
            
            <form onSubmit={handleDeployDB} className="p-6 space-y-5">
              <div>
                <label className="block text-[8px] tracking-widest text-emerald-400 uppercase mb-2">
                  // Database Instance Identifier
                </label>
                <input 
                  type="text" 
                  required 
                  value={deployDBParams.name} 
                  onChange={(e) => setDeployDBParams({...deployDBParams, name: e.target.value})}
                  className="w-full bg-[#02050f]/80 border border-slate-800 focus:border-emerald-500 focus:outline-none px-3 py-2 text-xs text-white placeholder:text-slate-700/60 rounded"
                  placeholder="production-postgresql"
                />
              </div>

              <div>
                <label className="block text-[8px] tracking-widest text-emerald-400 uppercase mb-2">
                  // Database Core Engine
                </label>
                <select 
                  value={deployDBParams.db_engine} 
                  onChange={(e) => {
                    const engine = e.target.value;
                    const version = engine === 'postgresql' ? '15' : (engine === 'mysql' ? '8.0' : '6.0');
                    setDeployDBParams({...deployDBParams, db_engine: engine, version});
                  }}
                  className="w-full bg-[#02050f]/80 border border-slate-800 focus:border-emerald-500 focus:outline-none px-3 py-2 text-xs text-white rounded bg-black"
                >
                  <option value="postgresql">PostgreSQL (12 TKN/hr)</option>
                  <option value="mysql">MySQL (8 TKN/hr)</option>
                  <option value="mongodb">MongoDB (15 TKN/hr)</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] tracking-widest text-emerald-400 uppercase mb-2">
                  // Disk Capacity Size (GB)
                </label>
                <input 
                  type="number" 
                  required 
                  min="10"
                  max="1000"
                  value={deployDBParams.size_gb} 
                  onChange={(e) => setDeployDBParams({...deployDBParams, size_gb: parseInt(e.target.value)})}
                  className="w-full bg-[#02050f]/80 border border-slate-800 focus:border-emerald-500 focus:outline-none px-3 py-2 text-xs text-white placeholder:text-slate-700/60 rounded"
                />
              </div>

              <div>
                <label className="block text-[8px] tracking-widest text-emerald-400 uppercase mb-2">
                  // Core Network Region
                </label>
                <select 
                  value={deployDBParams.region} 
                  onChange={(e) => setDeployDBParams({...deployDBParams, region: e.target.value})}
                  className="w-full bg-[#02050f]/80 border border-slate-800 focus:border-emerald-500 focus:outline-none px-3 py-2 text-xs text-white rounded bg-black"
                >
                  <option value="us-east-1">us-east-1 (N. Virginia Core)</option>
                  <option value="eu-central-1">eu-central-1 (Frankfurt Core)</option>
                  <option value="ap-south-1">ap-south-1 (Mumbai Core)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowDeployDBModal(false)} 
                  className="flex-1 py-2.5 border border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-widest hover:border-slate-600 transition-all rounded"
                >
                  [ Cancel ]
                </button>
                <button 
                  type="submit" 
                  disabled={isDeployingDB} 
                  className="flex-1 py-2.5 bg-emerald-500 border border-emerald-400 text-black text-xs font-bold uppercase tracking-widest hover:bg-emerald-400 disabled:opacity-40 transition-all rounded"
                >
                  {isDeployingDB ? 'PROVISIONING...' : 'DEPLOY_DATABASE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= STORAGE DEPLOYMENT MODAL ================= */}
      {showDeployBucketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 relative">
          <div className="absolute inset-0 bg-[#030712]/30 pointer-events-none"></div>
          
          <div className="max-w-md w-full bg-[#080d22]/90 border border-amber-500/30 rounded-lg shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden relative z-10 font-mono">
            <div className="px-6 py-4 border-b border-slate-800/80 bg-[#040817] flex justify-between items-center">
              <h2 className="text-xs font-bold text-white tracking-widest uppercase">// DEFINE_OBJECT_STORAGE_PARAMETERS</h2>
              <button onClick={() => setShowDeployBucketModal(false)} className="text-slate-500 hover:text-white text-xs">
                [X]
              </button>
            </div>
            
            <form onSubmit={handleDeployBucket} className="p-6 space-y-5">
              <div>
                <label className="block text-[8px] tracking-widest text-amber-400 uppercase mb-2">
                  // Unique Bucket Identifier Name
                </label>
                <input 
                  type="text" 
                  required 
                  value={deployBucketParams.name} 
                  onChange={(e) => setDeployBucketParams({...deployBucketParams, name: e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, '')})}
                  className="w-full bg-[#02050f]/80 border border-slate-800 focus:border-amber-500 focus:outline-none px-3 py-2 text-xs text-white placeholder:text-slate-700/60 rounded"
                  placeholder="nexus-assets-bucket"
                />
              </div>

              <div>
                <label className="block text-[8px] tracking-widest text-amber-400 uppercase mb-2">
                  // Storage Class Strategy
                </label>
                <select 
                  value={deployBucketParams.storage_class} 
                  onChange={(e) => setDeployBucketParams({...deployBucketParams, storage_class: e.target.value})}
                  className="w-full bg-[#02050f]/80 border border-slate-800 focus:border-amber-500 focus:outline-none px-3 py-2 text-xs text-white rounded bg-black"
                >
                  <option value="STANDARD">Standard Class (Hot Data - Low Latency)</option>
                  <option value="COLD">Cold Class (Infrequent Access)</option>
                  <option value="ARCHIVE">Archive Class (Glacier Deep Archive)</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] tracking-widest text-amber-400 uppercase mb-2">
                  // Cluster Replication Region
                </label>
                <select 
                  value={deployBucketParams.region} 
                  onChange={(e) => setDeployBucketParams({...deployBucketParams, region: e.target.value})}
                  className="w-full bg-[#02050f]/80 border border-slate-800 focus:border-amber-500 focus:outline-none px-3 py-2 text-xs text-white rounded bg-black"
                >
                  <option value="us-east-1">us-east-1 (N. Virginia Core)</option>
                  <option value="eu-central-1">eu-central-1 (Frankfurt Core)</option>
                  <option value="ap-south-1">ap-south-1 (Mumbai Core)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowDeployBucketModal(false)} 
                  className="flex-1 py-2.5 border border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-widest hover:border-slate-600 transition-all rounded"
                >
                  [ Cancel ]
                </button>
                <button 
                  type="submit" 
                  disabled={isDeployingBucket} 
                  className="flex-1 py-2.5 bg-amber-500 border border-amber-400 text-black text-xs font-bold uppercase tracking-widest hover:bg-amber-400 disabled:opacity-40 transition-all rounded"
                >
                  {isDeployingBucket ? 'INITIALIZING...' : 'INITIALIZE_VAULT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= VPC DEPLOYMENT MODAL ================= */}
      {showDeployVPCModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 relative">
          <div className="absolute inset-0 bg-[#030712]/30 pointer-events-none"></div>
          
          <div className="max-w-md w-full bg-[#080d22]/90 border border-purple-500/30 rounded-lg shadow-[0_0_50px_rgba(168,85,247,0.15)] overflow-hidden relative z-10 font-mono">
            <div className="px-6 py-4 border-b border-slate-800/80 bg-[#040817] flex justify-between items-center">
              <h2 className="text-xs font-bold text-white tracking-widest uppercase">// PROVISION_VPC_GRID_PARAMS</h2>
              <button onClick={() => setShowDeployVPCModal(false)} className="text-slate-500 hover:text-white text-xs">
                [X]
              </button>
            </div>
            
            <form onSubmit={handleDeployVPC} className="p-6 space-y-5">
              <div>
                <label className="block text-[8px] tracking-widest text-purple-400 uppercase mb-2">
                  // Network Grid Namespace
                </label>
                <input 
                  type="text" 
                  required 
                  value={deployVPCParams.name} 
                  onChange={(e) => setDeployVPCParams({...deployVPCParams, name: e.target.value})}
                  className="w-full bg-[#02050f]/80 border border-slate-800 focus:border-purple-500 focus:outline-none px-3 py-2 text-xs text-white placeholder:text-slate-700/60 rounded"
                  placeholder="nexus-vpc-core-01"
                />
              </div>

              <div>
                <label className="block text-[8px] tracking-widest text-purple-400 uppercase mb-2">
                  // CIDR IP Subnet Segment Allocation
                </label>
                <select 
                  value={deployVPCParams.cidr_block} 
                  onChange={(e) => setDeployVPCParams({...deployVPCParams, cidr_block: e.target.value})}
                  className="w-full bg-[#02050f]/80 border border-slate-800 focus:border-purple-500 focus:outline-none px-3 py-2 text-xs text-white rounded bg-black"
                >
                  <option value="10.0.0.0/16">10.0.0.0/16 (Private Cloud Block)</option>
                  <option value="172.16.0.0/16">172.16.0.0/16 (Corporate Cloud Block)</option>
                  <option value="192.168.0.0/16">192.168.0.0/16 (Internal Cluster Block)</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] tracking-widest text-purple-400 uppercase mb-2">
                  // Allocation Cloud Region
                </label>
                <select 
                  value={deployVPCParams.region} 
                  onChange={(e) => setDeployVPCParams({...deployVPCParams, region: e.target.value})}
                  className="w-full bg-[#02050f]/80 border border-slate-800 focus:border-purple-500 focus:outline-none px-3 py-2 text-xs text-white rounded bg-black"
                >
                  <option value="us-east-1">us-east-1 (N. Virginia Core)</option>
                  <option value="eu-central-1">eu-central-1 (Frankfurt Core)</option>
                  <option value="ap-south-1">ap-south-1 (Mumbai Core)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowDeployVPCModal(false)} 
                  className="flex-1 py-2.5 border border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-widest hover:border-slate-600 transition-all rounded"
                >
                  [ Cancel ]
                </button>
                <button 
                  type="submit" 
                  disabled={isDeployingVPC} 
                  className="flex-1 py-2.5 bg-purple-500 border border-purple-400 text-black text-xs font-bold uppercase tracking-widest hover:bg-purple-400 disabled:opacity-40 transition-all rounded"
                >
                  {isDeployingVPC ? 'ALLOCATING GRID...' : 'LAUNCH_VPC_GRID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CONNECT DETAILS MODAL ================= */}
      {selectedDBConnStr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-[#080d22] border border-emerald-500/30 p-6 rounded-lg font-mono relative shadow-2xl">
            <h3 className="text-emerald-400 text-xs font-bold tracking-widest uppercase mb-4">// SECURED_ENDPOINT_CREDENTIALS</h3>
            <p className="text-[10px] text-slate-500 mb-2 font-mono">Use the following endpoint string to bind application clients:</p>
            <div className="bg-black/60 border border-slate-850 p-4 rounded text-xs select-all text-emerald-300 font-mono break-all">
              {selectedDBConnStr}
            </div>
            <div className="flex justify-end mt-6">
              <button 
                onClick={() => setSelectedDBConnStr(null)}
                className="px-6 py-2 border border-slate-800 hover:border-emerald-500 text-slate-400 hover:text-emerald-400 text-xs uppercase tracking-widest transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EXPLORE BUCKET FILES PANEL (DRAWER) ================= */}
      {activeBucketDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg h-full bg-[#040816]/95 border-l border-amber-500/30 p-8 font-mono flex flex-col justify-between shadow-2xl relative">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-amber-400 text-sm font-bold uppercase tracking-wider">// Explore_Vault: {activeBucketDetails.name}</h3>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Status: Active | capacity: {activeBucketDetails.size_gb} GB</p>
                </div>
                <button onClick={() => setActiveBucketDetails(null)} className="text-slate-500 hover:text-white text-xs">
                  [X]
                </button>
              </div>

              {/* Upload simulated file box */}
              <div className="bg-black/40 border border-slate-850 p-4 rounded mb-6">
                <h4 className="text-[9px] text-slate-400 uppercase tracking-widest mb-3">// Write_Object_Stream</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] text-amber-500/80 uppercase mb-1.5">File Name</label>
                      <input 
                        type="text" 
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value.replace(/[^a-zA-Z0-9.-_]/g, ''))}
                        className="w-full bg-[#02050f] border border-slate-800 focus:border-amber-500 focus:outline-none px-3 py-1.5 text-xs text-white placeholder:text-slate-700/60 rounded"
                        placeholder="log_backup.tar.gz"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-amber-500/80 uppercase mb-1.5">Payload Size (GB)</label>
                      <input 
                        type="number" 
                        min="1"
                        max="500"
                        value={newFileSize}
                        onChange={(e) => setNewFileSize(parseInt(e.target.value) || 1)}
                        className="w-full bg-[#02050f] border border-slate-800 focus:border-amber-500 focus:outline-none px-3 py-1.5 text-xs text-white rounded"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => handleAddMockFile(activeBucketDetails)}
                    className="w-full py-2 bg-amber-500/10 border border-amber-500/40 text-amber-400 rounded hover:bg-amber-50 text-xs font-bold hover:text-black uppercase tracking-widest transition-all"
                  >
                    Commit File Stream
                  </button>
                </div>
              </div>

              {/* Files list */}
              <div>
                <h4 className="text-[9px] text-slate-400 uppercase tracking-widest mb-3">// Committed_Object_Blocks</h4>
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin">
                  {(bucketFiles[activeBucketDetails.id] || []).length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-slate-850 text-slate-500 text-[10px] uppercase tracking-widest">
                      Bucket is empty
                    </div>
                  ) : (
                    (bucketFiles[activeBucketDetails.id] || []).map((file, idx) => (
                      <div key={idx} className="bg-black/20 border border-slate-900 p-3 rounded flex justify-between items-center text-xs">
                        <div>
                          <span className="text-slate-200 font-bold block">{file.name}</span>
                          <span className="text-[9px] text-slate-500 font-mono uppercase">{file.size} GB Block size</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveMockFile(activeBucketDetails, idx)}
                          className="text-[9px] border border-red-500/30 text-red-400 px-3 py-1 hover:bg-red-500 hover:text-black transition-colors rounded uppercase"
                        >
                          Purge
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-900 pt-5 mt-6">
              <button 
                onClick={() => setActiveBucketDetails(null)}
                className="px-6 py-2 border border-slate-800 text-slate-400 hover:border-amber-500 hover:text-amber-400 text-xs uppercase tracking-widest transition-all rounded"
              >
                Dismiss Explore Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}