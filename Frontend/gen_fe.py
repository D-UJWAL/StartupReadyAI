import os

files = {
    "src/App.jsx": """import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import StartupRegistration from './pages/StartupRegistration';
import Navbar from './components/Navbar';

const ProtectedRoute = ({ children }) => {
    const { token } = useAuth();
    if (!token) return <Navigate to="/login" />;
    return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
        <Router>
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <main className="container mx-auto px-4 py-8">
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/register-startup" element={<ProtectedRoute><StartupRegistration /></ProtectedRoute>} />
                        <Route path="/" element={<Navigate to="/dashboard" />} />
                    </Routes>
                </main>
            </div>
        </Router>
    </AuthProvider>
  );
}

export default App;
""",
    "src/context/AuthContext.jsx": """import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState(null);

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUser();
        } else {
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
        }
    }, [token]);

    const fetchUser = async () => {
        try {
            const response = await axios.get('http://localhost:8000/api/me');
            setUser(response.data);
        } catch (error) {
            console.error('Error fetching user', error);
            setToken(null);
        }
    };

    const login = async (email, password) => {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        const response = await axios.post('http://localhost:8000/auth/login', formData);
        setToken(response.data.access_token);
    };

    const logout = () => {
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout, setToken }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
""",
    "src/components/Navbar.jsx": """import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { token, user, logout } = useAuth();

    return (
        <nav className="bg-white shadow-sm border-b">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link to="/" className="text-xl font-bold text-blue-600">StartupReady AI</Link>
                <div className="flex gap-4 items-center">
                    {token ? (
                        <>
                            <span className="text-gray-600">Welcome, {user?.full_name}</span>
                            <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
                            <Link to="/register-startup" className="text-gray-600 hover:text-gray-900">Register Startup</Link>
                            <button onClick={logout} className="text-red-600">Logout</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="text-gray-600">Login</Link>
                            <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-md">Register</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
""",
    "src/pages/Login.jsx": """import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError('Invalid email or password');
        }
    };

    return (
        <div className="max-w-md mx-auto mt-16 bg-white p-8 rounded-lg shadow-md border">
            <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
            {error && <div className="bg-red-100 text-red-600 p-3 rounded mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">Login</button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-600">
                Don't have an account? <Link to="/register" className="text-blue-600">Register</Link>
            </p>
        </div>
    );
}
""",
    "src/pages/Register.jsx": """import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
    const [formData, setFormData] = useState({ full_name: '', email: '', mobile: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:8000/auth/register', formData);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed');
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    return (
        <div className="max-w-md mx-auto mt-16 bg-white p-8 rounded-lg shadow-md border">
            <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>
            {error && <div className="bg-red-100 text-red-600 p-3 rounded mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input name="full_name" value={formData.full_name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Mobile</label>
                    <input name="mobile" value={formData.mobile} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">Register</button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-600">
                Already have an account? <Link to="/login" className="text-blue-600">Login</Link>
            </p>
        </div>
    );
}
""",
    "src/pages/Dashboard.jsx": """import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Dashboard() {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        axios.get('http://localhost:8000/api/dashboard')
            .then(res => setStats(res.data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
            {stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow border">
                        <h3 className="text-lg font-medium text-gray-500">Total Users</h3>
                        <p className="text-3xl font-bold mt-2">{stats.total_users}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow border">
                        <h3 className="text-lg font-medium text-gray-500">Registered Startups</h3>
                        <p className="text-3xl font-bold mt-2">{stats.total_startups}</p>
                    </div>
                </div>
            ) : (
                <p>Loading stats...</p>
            )}
        </div>
    );
}
""",
    "src/pages/StartupRegistration.jsx": """import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function StartupRegistration() {
    const [formData, setFormData] = useState({ name: '', industry: '', stage: '' });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:8000/api/startups', formData);
            navigate('/dashboard');
        } catch (err) {
            alert('Failed to register startup');
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md border">
            <h2 className="text-2xl font-bold mb-6">Register Your Startup</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Startup Name</label>
                    <input name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Industry</label>
                    <input name="industry" value={formData.industry} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Stage</label>
                    <select name="stage" value={formData.stage} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                        <option value="">Select Stage</option>
                        <option value="Idea">Idea</option>
                        <option value="Prototype">Prototype</option>
                        <option value="MVP">MVP</option>
                        <option value="Revenue">Revenue</option>
                        <option value="Growth">Growth</option>
                        <option value="Scaling">Scaling</option>
                    </select>
                </div>
                <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">Submit</button>
            </form>
        </div>
    );
}
""",
    "src/index.css": """@tailwind base;
@tailwind components;
@tailwind utilities;
""",
    "tailwind.config.js": """/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
""",
    "postcss.config.js": """export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
"""
}

for name, content in files.items():
    os.makedirs(os.path.dirname(name), exist_ok=True) if os.path.dirname(name) else None
    with open(name, "w") as f:
        f.write(content)

print("Frontend files generated!")
