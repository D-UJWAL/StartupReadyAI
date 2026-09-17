import { useState, useEffect } from 'react';
import api from '../api';
import { Users, Building2, TrendingUp, Activity, BarChart3, CheckCircle2, FileText, Lock, ArrowUpRight, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [startup, setStartup] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const navigate = useNavigate();
    const TOTAL_REG = 12;
    const TOTAL_EVAL = 15;

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [statsRes, startupsRes] = await Promise.all([
                    api.get('/api/dashboard'),
                    api.get('/api/startups').catch(() => ({ data: [] })),
                ]);
                setStats(statsRes.data);
                if (startupsRes.data.length > 0) setStartup(startupsRes.data[0]);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchAll();
    }, []);

    const regStep = startup?.registration_step || 0;
    const regComplete = regStep >= TOTAL_REG;
    const evalComplete = stats?.evaluations_completed === 1;
    const regProgress = Math.round((Math.min(regStep, TOTAL_REG) / TOTAL_REG) * 100);

    const StatCard = ({ title, value, icon: Icon, sub }) => (
        <div className="saas-card p-6 group hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-brand-50 group-hover:border-brand-100 transition-colors">
                    <Icon className="w-5 h-5 text-slate-600 group-hover:text-brand-600 transition-colors"/>
                </div>
            </div>
            <p className="text-slate-500 text-sm font-medium">{title}</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{value ?? '—'}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
    );

    return (
        <div className="dashboard-container py-8">
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.full_name?.split(' ')[0] || 'Founder'} 👋
                </h1>
                <p className="text-slate-500 mt-1">Here's your StartupReady AI dashboard.</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-40">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-400"/>
                </div>
            ) : (
                <>
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                        <StatCard title="Founders in Team" value={stats?.total_users ?? 1} icon={Users} sub="From registration data"/>
                        <StatCard title="Registered Startups" value={stats?.total_startups ?? 0} icon={Building2} sub={regComplete ? 'Registration complete' : 'Complete all 12 steps'}/>
                        <StatCard title="Evaluations Completed" value={stats?.evaluations_completed ?? 0} icon={CheckCircle2} sub={evalComplete ? 'All 15 sections done' : 'Complete 15-step assessment'}/>
                        <StatCard title="Avg. Readiness Score" value={stats?.avg_score ?? '--/100'} icon={Activity} sub={evalComplete ? 'Based on evaluation data' : 'Complete evaluation to score'}/>
                    </div>

                    {/* Main 2-Column Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* LEFT — Startup Profile */}
                        <div className="lg:col-span-2">
                            <div className="saas-card p-0 overflow-hidden h-full flex flex-col">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-brand-500"/>
                                    <h2 className="font-bold text-slate-900">Your Startup Profile</h2>
                                </div>
                                <div className="p-6 flex-1">
                                    {!startup ? (
                                        <div className="text-center py-8">
                                            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Building2 className="w-8 h-8 text-brand-500"/>
                                            </div>
                                            <h3 className="font-bold text-slate-900 mb-2">No startup registered yet</h3>
                                            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">Complete the 12-step registration to unlock AI evaluation, mentor matching, and funding readiness scoring.</p>
                                            <Link to="/register-startup" className="saas-button saas-button-primary">Start Registration</Link>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex items-start justify-between gap-4 mb-6">
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-900">{startup.name}</h3>
                                                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-2 flex-wrap">
                                                        <span>{startup.industry}</span>
                                                        <span>·</span>
                                                        <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs font-semibold">{startup.stage}</span>
                                                        {regComplete && <span className="bg-emerald-100 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded text-xs font-semibold">✓ Registered</span>}
                                                    </p>
                                                </div>
                                                <Link to="/register-startup" className="saas-button saas-button-secondary text-xs py-1.5 px-3 shrink-0">
                                                    {regComplete ? 'Edit Profile' : 'Continue'}
                                                </Link>
                                            </div>
                                            <div className="mb-4">
                                                <div className="flex justify-between text-sm mb-1.5">
                                                    <span className="text-slate-600 font-medium">Registration Progress</span>
                                                    <span className="font-bold text-brand-600">{Math.min(regStep, TOTAL_REG)} / {TOTAL_REG}</span>
                                                </div>
                                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-500 ${regComplete ? 'bg-emerald-500' : 'bg-brand-500'}`}
                                                        style={{ width: `${regProgress}%` }}/>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1">{regProgress}% complete</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT — AI Check */}
                        <div className="lg:col-span-1">
                            <div className="saas-card p-6 bg-gradient-to-br from-brand-900 to-brand-700 text-white border-none shadow-lg shadow-brand-900/20 h-full flex flex-col relative overflow-hidden">
                                <Activity className="w-44 h-44 text-white/5 absolute -bottom-8 -right-8"/>
                                <div className="relative z-10 flex-1 flex flex-col">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                                            <BarChart3 className="w-5 h-5 text-brand-100"/>
                                        </div>
                                        <h3 className="font-bold text-lg">AI Readiness Check</h3>
                                    </div>
                                    <p className="text-brand-100 text-sm leading-relaxed mb-6">
                                        {evalComplete
                                            ? 'Your evaluation is complete. View your full funding readiness score and AI recommendations below.'
                                            : 'Complete the 15-step evaluation to get your funding readiness score and recommendations.'}
                                    </p>
                                    <div className="mt-auto">
                                        {evalComplete ? (
                                            <div className="bg-white/10 rounded-xl p-4 mb-4 border border-white/10">
                                                <p className="text-brand-200 text-xs mb-1">Your Score</p>
                                                <p className="text-3xl font-extrabold">{stats?.avg_score}</p>
                                            </div>
                                        ) : null}
                                        {regComplete ? (
                                            <Link to="/evaluate" className="w-full bg-white text-brand-900 font-semibold py-2.5 px-4 rounded-xl text-sm hover:bg-brand-50 transition-colors flex items-center justify-center gap-2">
                                                {evalComplete ? 'View Full Result' : 'Start Evaluation'}
                                                <ArrowUpRight className="w-4 h-4"/>
                                            </Link>
                                        ) : (
                                            <div className="w-full bg-white/10 text-brand-300 font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 cursor-not-allowed border border-white/10">
                                                <Lock className="w-4 h-4"/>Complete Registration First
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Next Steps */}
                    <div>
                        <h3 className="font-bold text-slate-900 mb-4 text-lg">Next Steps</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* 1. Startup Profile */}
                            <Link to="/register-startup" className="saas-card p-5 hover:border-brand-300 hover:shadow-md group flex gap-4 items-start transition-all">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${regComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-100 text-brand-600'}`}>
                                    {regComplete ? <CheckCircle2 className="w-5 h-5"/> : <Building2 className="w-5 h-5"/>}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900 text-sm group-hover:text-brand-600 transition-colors">1. Startup Profile</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{regComplete ? '✓ Completed' : `Step ${Math.min(regStep, TOTAL_REG)} / ${TOTAL_REG}`}</p>
                                </div>
                            </Link>

                            {/* 2. AI Evaluation */}
                            {regComplete ? (
                                <Link to="/evaluate" className="saas-card p-5 hover:border-brand-300 hover:shadow-md group flex gap-4 items-start transition-all">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${evalComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-100 text-brand-600'}`}>
                                        {evalComplete ? <CheckCircle2 className="w-5 h-5"/> : <Activity className="w-5 h-5"/>}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 text-sm group-hover:text-brand-600 transition-colors">2. AI Evaluation</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{evalComplete ? '✓ Completed' : 'Start 15-step assessment'}</p>
                                    </div>
                                </Link>
                            ) : (
                                <div className="saas-card p-5 opacity-60 cursor-not-allowed flex gap-4 items-start">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0"><Lock className="w-5 h-5"/></div>
                                    <div>
                                        <p className="font-semibold text-slate-500 text-sm">2. AI Evaluation</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Requires completed profile</p>
                                    </div>
                                </div>
                            )}

                            {/* 3. Upload Deck */}
                            {regComplete ? (
                                <Link to="/register-startup" className="saas-card p-5 hover:border-brand-300 hover:shadow-md group flex gap-4 items-start transition-all">
                                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
                                        <FileText className="w-5 h-5"/>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 text-sm group-hover:text-brand-600 transition-colors">3. Upload Deck</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Pitch deck &amp; documents</p>
                                    </div>
                                </Link>
                            ) : (
                                <div className="saas-card p-5 opacity-60 cursor-not-allowed flex gap-4 items-start">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0"><Lock className="w-5 h-5"/></div>
                                    <div>
                                        <p className="font-semibold text-slate-500 text-sm">3. Upload Deck</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Requires completed profile</p>
                                    </div>
                                </div>
                            )}

                            {/* 4. View Score */}
                            {evalComplete ? (
                                <Link to="/evaluate" className="saas-card p-5 hover:border-brand-300 hover:shadow-md group flex gap-4 items-start transition-all">
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                        <BarChart3 className="w-5 h-5"/>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 text-sm group-hover:text-brand-600 transition-colors">4. View Score</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{stats?.avg_score} · View full report</p>
                                    </div>
                                </Link>
                            ) : (
                                <div className="saas-card p-5 opacity-60 cursor-not-allowed flex gap-4 items-start">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0"><Lock className="w-5 h-5"/></div>
                                    <div>
                                        <p className="font-semibold text-slate-500 text-sm">4. View Score</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Complete evaluation first</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
