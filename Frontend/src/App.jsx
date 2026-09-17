import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import StartupRegistration from './pages/StartupRegistration';
import StartupEvaluation from './pages/StartupEvaluation';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';

const ProtectedRoute = ({ children }) => {
    const { token } = useAuth();
    if (!token) return <Navigate to="/login" />;
    return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
        <Router>
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <Navbar />
                <main className="flex-1">
                    <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/register-startup" element={<ProtectedRoute><StartupRegistration /></ProtectedRoute>} />
                        <Route path="/evaluate" element={<ProtectedRoute><StartupEvaluation /></ProtectedRoute>} />
                    </Routes>
                </main>
            </div>
        </Router>
    </AuthProvider>
  );
}

export default App;
