import { Link } from 'react-router-dom';
import { Rocket, ArrowRight } from 'lucide-react';

export default function Landing() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
            <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30 mb-8">
                <Rocket className="text-white w-8 h-8" />
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-4">
                StartupReady <span className="text-brand-600">AI</span>
            </h1>
            <p className="text-xl text-slate-500 mb-8 max-w-2xl">
                Build. Evaluate. Get Funding Ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register" className="saas-button saas-button-primary px-8 py-3 text-base">
                    Get Started <ArrowRight className="w-5 h-5" />
                </Link>
                <Link to="/login" className="saas-button saas-button-secondary px-8 py-3 text-base">
                    Log In
                </Link>
            </div>
        </div>
    );
}
