import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Rocket, Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
                <div className="w-12 h-12 bg-brand-600 rounded-xl mx-auto flex items-center justify-center shadow-lg shadow-brand-500/30 mb-4">
                    <Rocket className="text-white w-6 h-6" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
                <p className="mt-2 text-sm text-slate-500">
                    Log in to access your startup dashboard
                </p>
            </div>

            <div className="saas-card w-full max-w-md p-8">
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg flex items-start gap-3 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                        <div className="input-wrapper">
                            <div className="input-icon">
                                <Mail className="h-5 w-5" />
                            </div>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                required 
                                className="saas-input"
                                placeholder="founder@startup.com" 
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                        <div className="input-wrapper password-wrapper">
                            <div className="input-icon">
                                <Lock className="h-5 w-5" />
                            </div>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                                className="saas-input"
                                placeholder="••••••••" 
                            />
                            <button 
                                type="button" 
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                    
                    <div className="pt-2">
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className={`saas-button saas-button-primary w-full ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? 'Signing in...' : 'Sign in'}
                            {!isLoading && <ArrowRight className="w-4 h-4 ml-1" />}
                        </button>
                    </div>
                </form>
                
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="text-center text-sm text-slate-500">
                        Don't have an account?{' '}
                        <Link to="/register" className="font-medium text-brand-600 hover:text-brand-500 transition-colors">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
