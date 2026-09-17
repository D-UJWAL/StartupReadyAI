import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Rocket, LogOut, User as UserIcon } from 'lucide-react';

export default function Navbar() {
    const { token, user, logout } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-sm">
                        <Rocket className="text-white w-5 h-5" />
                    </div>
                    <Link to="/" className="text-xl font-bold tracking-tight text-slate-900">
                        StartupReady <span className="text-brand-600">AI</span>
                    </Link>
                </div>
                
                <div className="flex gap-4 items-center">
                    {token ? (
                        <>
                            <div className="hidden md:flex items-center gap-6 mr-4 border-r border-slate-200 pr-6">
                                <Link to="/dashboard" className={`text-sm font-medium transition-colors ${isActive('/dashboard') ? 'text-brand-600' : 'text-slate-500 hover:text-slate-900'} flex items-center gap-2`}>
                                    <LayoutDashboard className="w-4 h-4" />
                                    Dashboard
                                </Link>
                                <Link to="/register-startup" className={`text-sm font-medium transition-colors ${isActive('/register-startup') ? 'text-brand-600' : 'text-slate-500 hover:text-slate-900'} flex items-center gap-2`}>
                                    <Rocket className="w-4 h-4" />
                                    Register Startup
                                </Link>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center">
                                    <UserIcon className="w-4 h-4 text-brand-600" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.full_name}</span>
                                <button onClick={logout} className="ml-2 text-slate-400 hover:text-red-500 transition-colors" title="Logout">
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Log in</Link>
                            <Link to="/register" className="saas-button saas-button-primary">Get Started</Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
