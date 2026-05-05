import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Builder from './pages/Builder';
import Dashboard from './pages/Dashboard';
import AgentSettings from './pages/AgentSettings';
import CRMView from './pages/CRMView';
import Billing from './pages/Billing';

function Protected({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/build" element={<Builder />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/agent/:id" element={<Protected><AgentSettings /></Protected>} />
        <Route path="/agent/:id/crm" element={<Protected><CRMView /></Protected>} />
        <Route path="/billing" element={<Protected><Billing /></Protected>} />
      </Routes>
    </BrowserRouter>
  );
}
