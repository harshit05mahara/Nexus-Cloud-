import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PublicDashboard from './PublicDashboard';
import Login from './Login';
import Dashboard from './Dashboard'; 
import InstanceWorkspace from './InstancesWorkspace'; // 🟢 Imported your new workspace page

function App() {
  return (
    <Router>
      <Routes>
        {/* Route 1: The Public Landing Page */}
        <Route path="/" element={<PublicDashboard />} />
        
        {/* Route 2: The Auth Gateway */}
        <Route path="/login" element={<Login />} />
        
        {/* Route 3: The Internal Orchestration Console */}
        <Route path="/console" element={<Dashboard />} />

        {/* Route 4: Dedicated Active Workspace Page with Dynamic ID Parameter */}
        <Route path="/workspace/:id" element={<InstanceWorkspace />} />
        
        {/* Catch all - Redirects to landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;