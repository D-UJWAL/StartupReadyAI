import { useState } from 'react';
import api from '../api';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Phone, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Register() {
    const [formData, setFormData] = useState({ full_name: '', email: '', mobile: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await api.post('/auth/register', formData);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed. Please check your network and try again.');
            setIsLoading(false);
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    return (
        <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create your account</h2>
                <p className="mt-2 text-sm text-slate-500">
                    Join StartupReady AI and evaluate your funding readiness
                </p>
            </div>

            <div className="saas-card w-full max-w-md p-8">
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg flex items-start gap-3 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                        <div className="input-wrapper">
                            <div className="input-icon">
                                <User className="h-5 w-5" />
                            </div>
                            <input 
                                name="full_name" 
                                value={formData.full_name} 
                                onChange={handleChange} 
                                required 
                                className="saas-input"
                                placeholder="Jane Doe" 
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                        <div className="input-wrapper">
                            <div className="input-icon">
                                <Mail className="h-5 w-5" />
                            </div>
                            <input 
                                type="email" 
                                name="email" 
                                value={formData.email} 
                                onChange={handleChange} 
                                required 
                                className="saas-input"
                                placeholder="founder@startup.com" 
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile Number</label>
                        <div className="input-wrapper">
                            <div className="input-icon">
                                <Phone className="h-5 w-5" />
                            </div>
                            <input 
                                name="mobile" 
                                value={formData.mobile} 
                                onChange={handleChange} 
                                required 
                                className="saas-input"
                                placeholder="+1 (555) 000-0000" 
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
                                name="password" 
                                value={formData.password} 
                                onChange={handleChange} 
                                required 
                                className="saas-input"
                                placeholder="••••••••" 
                                minLength="6"
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
                            {isLoading ? 'Creating account...' : 'Create account'}
                            {!isLoading && <ArrowRight className="w-4 h-4 ml-1" />}
                        </button>
                    </div>
                </form>
                
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="text-center text-sm text-slate-500">
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-500 transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
