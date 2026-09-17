import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, ChevronLeft, Save, Upload, Plus, Trash2, FileText, X, Loader2, Eye, Download, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DOCS = [
    { key: 'pitch_deck',      label: 'Pitch Deck',      hint: 'PDF/PPTX' },
    { key: 'company_profile', label: 'Company Profile',  hint: 'PDF/DOCX' },
    { key: 'business_plan',   label: 'Business Plan',   hint: 'PDF/DOCX' },
    { key: 'financial_model', label: 'Financial Model',  hint: 'XLSX/PDF' },
    { key: 'founder_resume',  label: 'Founder Resume',  hint: 'PDF' },
    { key: 'brochure',        label: 'Brochure',         hint: 'PDF/PNG' },
    { key: 'demo_video',      label: 'Demo Video',       hint: 'MP4 (optional)' },
];

export default function StartupRegistration() {
    const [step, setStep] = useState(1);
    const [maxStep, setMaxStep] = useState(1);
    const [showEditList, setShowEditList] = useState(false);
    const [formData, setFormData] = useState({ name: '', industry: '', stage: '' });
    const [regData, setRegData] = useState({
        designation: '', linkedin: '', exp: '', qualification: '', bio: '', skills: '',
        tagline: '', website: '', startup_email: '', startup_mobile: '',
        company_type: 'Private Limited', inc_status: '', inc_date: '', cin: '', gst: '',
        startup_india: '', dpiit: '',
        country: '', state: '', city: '', address: '', pin: '',
        team: [{ name: '', role: '', email: '', mobile: '', equity: '', linkedin: '', exp: '' }],
        problem: '', customers: '', unique: '', revenue: 'Pre Revenue', funding: 'Bootstrapped',
    });
    const [uploads, setUploads] = useState({});      // { doc_key: DocumentResponse }
    const [uploadingKey, setUploadingKey] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const fileInputRefs = useRef({});
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const TOTAL = 12;

    // ── Load existing data on mount ──────────────────────────────────────────
    useEffect(() => {
        if (user?.startup_id) {
            api.get('/api/startups').then(res => {
                const s = res.data[0];
                if (s) {
                    setFormData({ name: s.name || '', industry: s.industry || '', stage: s.stage || '' });
                    const savedStep = s.registration_step || 1;
                    setStep(Math.min(savedStep, TOTAL));
                    setMaxStep(savedStep);
                    try {
                        if (s.registration_data) setRegData(prev => ({ ...prev, ...JSON.parse(s.registration_data) }));
                    } catch (e) {}
                }
            });
            // Load existing uploads
            api.get('/api/uploads').then(res => {
                const map = {};
                res.data.forEach(d => { map[d.doc_type] = d; });
                setUploads(map);
            }).catch(() => {});
        }
    }, [user?.startup_id]);

    // ── Save to backend ──────────────────────────────────────────────────────
    const handleSave = async (targetStep = step, isFinal = false) => {
        setIsSaving(true);
        setError('');
        try {
            const payload = {
                name: formData.name || 'Draft',
                industry: formData.industry || 'Other',
                stage: formData.stage || 'Idea',
                registration_data: JSON.stringify(regData),
                registration_step: isFinal ? TOTAL : targetStep,
            };
            if (user?.startup_id) {
                await api.put(`/api/startups/${user.startup_id}`, payload);
            } else {
                await api.post('/api/startups', payload);
                await refreshUser(); // get updated startup_id from server
            }
            setSuccessMsg('Saved ✓');
            setTimeout(() => setSuccessMsg(''), 2500);
        } catch (err) {
            const detail = err.response?.data?.detail;
            setError(detail || 'Failed to save. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const goNext = async (e) => {
        if (e) e.preventDefault();
        await handleSave(step + 1, false);
        setStep(p => Math.min(p + 1, TOTAL));
    };

    const goPrev = () => setStep(p => Math.max(p - 1, 1));

    const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleReg = (e) => setRegData(p => ({ ...p, [e.target.name]: e.target.value }));

    // ── Team helpers ─────────────────────────────────────────────────────────
    const addMember = () => {
        if (regData.team.length < 10)
            setRegData(p => ({ ...p, team: [...p.team, { name: '', role: '', email: '', mobile: '', equity: '', linkedin: '', exp: '' }] }));
    };
    const removeMember = (i) => setRegData(p => ({ ...p, team: p.team.filter((_, idx) => idx !== i) }));
    const updateMember = (i, e) => {
        const t = [...regData.team];
        t[i][e.target.name] = e.target.value;
        setRegData(p => ({ ...p, team: t }));
    };

    // ── File upload ──────────────────────────────────────────────────────────
    const handleFileUpload = async (docKey, file) => {
        if (!file) return;
        setUploadingKey(docKey);
        setError('');
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('doc_type', docKey);
            const res = await api.post('/api/uploads', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploads(prev => ({ ...prev, [docKey]: res.data }));
            setSuccessMsg(`${DOCS.find(d => d.key === docKey)?.label} uploaded ✓`);
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            const detail = err.response?.data?.detail;
            setError(detail || 'Upload failed. Check file type and size (max 15 MB).');
        } finally {
            setUploadingKey(null);
        }
    };

    const handleRemoveUpload = async (docKey) => {
      
  const handleDownload = async (docId, filename, action) => {
    try {
      const res = await api.get(`/api/uploads/${docId}/${action}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] }));
      if (action === 'view') {
        window.open(url, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch (err) {
      setError(`Failed to ${action} document.`);
    }
  };
  const doc = uploads[docKey];
        if (!doc) return;
        try {
            await api.delete(`/api/uploads/${doc.id}`);
            setUploads(prev => { const n = { ...prev }; delete n[docKey]; return n; });
        } catch (err) {
            setError('Could not remove file.');
        }
    };

    const progress = Math.round(((step - 1) / (TOTAL - 1)) * 100);

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-sm shrink-0">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Startup Profile Registration</h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            <span className="font-semibold text-brand-600">Step {step} of {TOTAL}</span>
                            {step < TOTAL && <span> · ~{TOTAL - step} steps remaining</span>}
                        </p>
                    </div>
                </div>
                <div className="text-sm font-medium">
                    {isSaving ? <span className="text-slate-400 flex items-center gap-1"><Loader2 className="w-4 h-4 animate-spin"/>Saving…</span>
                    : successMsg ? <span className="text-emerald-600">{successMsg}</span>
                    : <button type="button" onClick={() => handleSave(step)} className="text-slate-500 hover:text-brand-600 flex items-center gap-1.5 transition-colors">
                        <Save className="w-4 h-4"/>Save &amp; Exit
                      </button>}
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-slate-200 rounded-full mb-8 overflow-hidden">
                <div className="h-full bg-brand-500 transition-all duration-500 rounded-full" style={{ width: `${progress}%` }} />
            </div>

            {/* Step counter pills */}
            <div className="flex gap-1.5 mb-6 flex-wrap">
                {Array.from({ length: TOTAL }, (_, i) => i + 1).map(s => (
                    <div key={s} className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 transition-colors
                        ${s < step ? 'bg-emerald-500 text-white' : s === step ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {s < step ? <CheckCircle2 className="w-4 h-4"/> : s}
                    </div>
                ))}
            </div>

            <div className="saas-card min-h-[420px] flex flex-col overflow-hidden">
                <div className="p-6 sm:p-8 flex-1 flex flex-col">
                    {error && (
                        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg flex gap-2 items-start">
                            <span className="shrink-0 mt-0.5">⚠</span><span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={goNext} className="flex-1 flex flex-col space-y-6">

                        {/* ── STEP 1 — WELCOME ── */}
                        {step === 1 && (
                            <div className="text-center py-8">
                                <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-5">
                                    <svg className="w-10 h-10 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                </div>
                                <h2 className="text-3xl font-bold text-slate-900 mb-3">Welcome to StartupReady AI</h2>
                                <p className="text-slate-500 text-lg mb-8 max-w-lg mx-auto">Let's build your startup profile and assess your funding readiness. All progress is automatically saved.</p>
                                <div className="inline-block text-left bg-slate-50 border border-slate-200 p-6 rounded-xl space-y-3 max-w-sm mx-auto">
                                    {['Complete in ~5 minutes', 'Save & resume anytime', '12 structured steps', 'Unlocks AI Evaluation'].map(t => (
                                        <p key={t} className="flex items-center gap-3 text-slate-700 text-sm font-medium">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0"/>{t}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── STEP 2 — FOUNDER ACCOUNT ── */}
                        {step === 2 && (
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-5">Founder Account</h2>
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-3 mb-6">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0"/>
                                    <div>
                                        <p className="font-semibold">Account verified for {user?.full_name}</p>
                                        <p className="text-sm text-emerald-700">{user?.email} · {user?.mobile}</p>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500">Your account was created during sign-up. You can continue to Step 3 to complete your founder profile.</p>
                            </div>
                        )}

                        {/* ── STEP 3 — FOUNDER PROFILE ── */}
                        {step === 3 && (
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-5">Founder Profile</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div><label className="form-label">Designation *</label>
                                        <input name="designation" value={regData.designation} onChange={handleReg} required className="saas-input" placeholder="CEO / Founder"/></div>
                                    <div><label className="form-label">Years of Experience *</label>
                                        <input type="number" name="exp" value={regData.exp} onChange={handleReg} required min="0" max="50" className="saas-input" placeholder="5"/></div>
                                    <div><label className="form-label">LinkedIn Profile</label>
                                        <input type="url" name="linkedin" value={regData.linkedin} onChange={handleReg} className="saas-input" placeholder="https://linkedin.com/in/…"/></div>
                                    <div><label className="form-label">Highest Qualification</label>
                                        <input name="qualification" value={regData.qualification} onChange={handleReg} className="saas-input" placeholder="MBA, B.Tech…"/></div>
                                    <div><label className="form-label">Key Skills</label>
                                        <input name="skills" value={regData.skills} onChange={handleReg} className="saas-input" placeholder="Product, AI, Marketing…"/></div>
                                    <div className="sm:col-span-2"><label className="form-label">Founder Bio *</label>
                                        <textarea name="bio" value={regData.bio} onChange={handleReg} required rows={3} className="saas-input" placeholder="Brief professional background (2–3 sentences)…"/></div>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 4 — STARTUP BASICS ── */}
                        {step === 4 && (
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-5">Startup Basic Information</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="sm:col-span-2"><label className="form-label">Startup Name *</label>
                                        <input name="name" value={formData.name} onChange={handleChange} required className="saas-input" placeholder="Acme Technologies"/></div>
                                    <div className="sm:col-span-2"><label className="form-label">Tagline</label>
                                        <input name="tagline" value={regData.tagline} onChange={handleReg} className="saas-input" placeholder="One-line description of what you do"/></div>
                                    <div><label className="form-label">Startup Email *</label>
                                        <input type="email" name="startup_email" value={regData.startup_email} onChange={handleReg} required className="saas-input" placeholder="hello@startup.com"/></div>
                                    <div><label className="form-label">Startup Mobile *</label>
                                        <input name="startup_mobile" value={regData.startup_mobile} onChange={handleReg} required className="saas-input" placeholder="+91 98765 43210"/></div>
                                    <div className="sm:col-span-2"><label className="form-label">Website</label>
                                        <input type="url" name="website" value={regData.website} onChange={handleReg} className="saas-input" placeholder="https://www.startup.com"/></div>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 5 — CATEGORY ── */}
                        {step === 5 && (
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-5">Startup Category &amp; Stage</h2>
                                <div className="space-y-6">
                                    <div>
                                        <label className="form-label">Industry *</label>
                                        <select name="industry" value={formData.industry} onChange={handleChange} required className="saas-input">
                                            <option value="">Select Industry…</option>
                                            {['FinTech','HealthTech','EdTech','AgriTech','CleanTech','AI / ML','SaaS','E-Commerce','Logistics','Deep Tech','D2C','Gaming','Media','HR Tech','Legal Tech','Real Estate','Other'].map(o => (
                                                <option key={o} value={o}>{o}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label mb-3 block">Startup Stage *</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {['Idea','Prototype','MVP','Pilot','Revenue','Growth','Scaling'].map(s => (
                                                <div key={s} onClick={() => setFormData(p => ({ ...p, stage: s }))}
                                                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all text-center ${formData.stage === s ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'}`}>
                                                    <p className={`font-semibold text-sm ${formData.stage === s ? 'text-brand-700' : 'text-slate-700'}`}>{s}</p>
                                                </div>
                                            ))}
                                        </div>
                                        {!formData.stage && <p className="text-xs text-red-500 mt-2">Please select a stage</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 6 — COMPANY INFO ── */}
                        {step === 6 && (
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-5">Company Information</h2>
                                <div className="space-y-5">
                                    <div>
                                        <label className="form-label">Incorporation Status *</label>
                                        <select name="inc_status" value={regData.inc_status} onChange={handleReg} required className="saas-input">
                                            <option value="">Select…</option>
                                            <option value="Incorporated">Incorporated</option>
                                            <option value="Not Incorporated">Not Incorporated (Sole Proprietor / Partnership)</option>
                                            <option value="In Progress">Incorporation In Progress</option>
                                        </select>
                                    </div>
                                    {regData.inc_status === 'Incorporated' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                                            <div>
                                                <label className="form-label">Company Type</label>
                                                <select name="company_type" value={regData.company_type} onChange={handleReg} className="saas-input">
                                                    {['Private Limited','LLP','One Person Company','Partnership Firm'].map(o => <option key={o}>{o}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="form-label">Incorporation Date</label>
                                                <input type="date" name="inc_date" value={regData.inc_date} onChange={handleReg} className="saas-input"/>
                                            </div>
                                            <div>
                                                <label className="form-label">CIN Number</label>
                                                <input name="cin" value={regData.cin} onChange={handleReg} className="saas-input" placeholder="U12345MH2023PTC…"/>
                                            </div>
                                            <div>
                                                <label className="form-label">GST Number</label>
                                                <input name="gst" value={regData.gst} onChange={handleReg} className="saas-input" placeholder="27AAAAA0000A1Z5"/>
                                            </div>
                                            <div>
                                                <label className="form-label">Startup India Registration</label>
                                                <select name="startup_india" value={regData.startup_india} onChange={handleReg} className="saas-input">
                                                    <option value="">Not Applied</option>
                                                    <option value="Applied">Applied</option>
                                                    <option value="Recognized">DPIIT Recognized</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="form-label">DPIIT Number</label>
                                                <input name="dpiit" value={regData.dpiit} onChange={handleReg} className="saas-input" placeholder="DIPP…"/>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── STEP 7 — LOCATION ── */}
                        {step === 7 && (
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-5">Location</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div><label className="form-label">Country *</label>
                                        <input name="country" value={regData.country} onChange={handleReg} required className="saas-input" placeholder="India"/></div>
                                    <div><label className="form-label">State *</label>
                                        <input name="state" value={regData.state} onChange={handleReg} required className="saas-input" placeholder="Maharashtra"/></div>
                                    <div><label className="form-label">City *</label>
                                        <input name="city" value={regData.city} onChange={handleReg} required className="saas-input" placeholder="Mumbai"/></div>
                                    <div><label className="form-label">PIN / ZIP Code *</label>
                                        <input name="pin" value={regData.pin} onChange={handleReg} required className="saas-input" placeholder="400001"/></div>
                                    <div className="sm:col-span-2"><label className="form-label">Office Address *</label>
                                        <textarea name="address" value={regData.address} onChange={handleReg} required rows={2} className="saas-input" placeholder="Full street address…"/></div>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 8 — TEAM ── */}
                        {step === 8 && (
                            <div>
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-xl font-bold text-slate-900">Team &amp; Founders</h2>
                                    {regData.team.length < 10 && (
                                        <button type="button" onClick={addMember} className="saas-button saas-button-secondary text-xs py-1.5 px-3">
                                            <Plus className="w-3.5 h-3.5"/>Add Co-Founder
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-5">
                                    {regData.team.map((m, i) => (
                                        <div key={i} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 relative">
                                            {i > 0 && (
                                                <button type="button" onClick={() => removeMember(i)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            )}
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">{i === 0 ? 'Primary Founder' : `Co-Founder ${i + 1}`}</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div><label className="form-label text-xs">Full Name *</label>
                                                    <input name="name" value={m.name} onChange={e => updateMember(i, e)} required className="saas-input py-2 text-sm"/></div>
                                                <div><label className="form-label text-xs">Role / Title *</label>
                                                    <input name="role" value={m.role} onChange={e => updateMember(i, e)} required className="saas-input py-2 text-sm" placeholder="CTO, COO…"/></div>
                                                <div><label className="form-label text-xs">Email *</label>
                                                    <input type="email" name="email" value={m.email} onChange={e => updateMember(i, e)} required className="saas-input py-2 text-sm"/></div>
                                                <div><label className="form-label text-xs">Mobile</label>
                                                    <input name="mobile" value={m.mobile} onChange={e => updateMember(i, e)} className="saas-input py-2 text-sm"/></div>
                                                <div><label className="form-label text-xs">Equity %</label>
                                                    <input type="number" name="equity" value={m.equity} onChange={e => updateMember(i, e)} min="0" max="100" className="saas-input py-2 text-sm" placeholder="0–100"/></div>
                                                <div><label className="form-label text-xs">Years Experience</label>
                                                    <input type="number" name="exp" value={m.exp} onChange={e => updateMember(i, e)} min="0" className="saas-input py-2 text-sm"/></div>
                                                <div className="sm:col-span-2"><label className="form-label text-xs">LinkedIn Profile</label>
                                                    <input type="url" name="linkedin" value={m.linkedin} onChange={e => updateMember(i, e)} className="saas-input py-2 text-sm" placeholder="https://linkedin.com/in/…"/></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── STEP 9 — SNAPSHOT ── */}
                        {step === 9 && (
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-5">Startup Snapshot</h2>
                                <div className="space-y-5">
                                    <div><label className="form-label">What problem are you solving? *</label>
                                        <textarea name="problem" value={regData.problem} onChange={handleReg} required rows={3} className="saas-input" placeholder="Describe the specific pain point you address…"/></div>
                                    <div><label className="form-label">Who are your customers? *</label>
                                        <textarea name="customers" value={regData.customers} onChange={handleReg} required rows={2} className="saas-input" placeholder="Target segments, demographics, or businesses…"/></div>
                                    <div><label className="form-label">What makes your startup unique? *</label>
                                        <textarea name="unique" value={regData.unique} onChange={handleReg} required rows={2} className="saas-input" placeholder="Your key differentiators vs. alternatives…"/></div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div><label className="form-label">Current Revenue Stage</label>
                                            <select name="revenue" value={regData.revenue} onChange={handleReg} className="saas-input">
                                                {['Pre Revenue','< ₹10L','₹10L–50L','₹50L–1Cr','₹1Cr–5Cr','₹5Cr+'].map(o => <option key={o}>{o}</option>)}
                                            </select>
                                        </div>
                                        <div><label className="form-label">Funding Raised</label>
                                            <select name="funding" value={regData.funding} onChange={handleReg} className="saas-input">
                                                {['Bootstrapped','Friends & Family','Angel / Pre-Seed','Seed','Series A','Series B+'].map(o => <option key={o}>{o}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 10 — DOCUMENTS ── */}
                        {step === 10 && (
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-2">Upload Documents</h2>
                                <p className="text-sm text-slate-500 mb-5">All documents are optional. Allowed: PDF, DOCX, PPTX, XLSX, PNG, JPG, MP4. Max 15 MB each.</p>
                                <div className="space-y-3">
                                    {DOCS.map(doc => {
                                        const uploaded = uploads[doc.key];
                                        const isUploading = uploadingKey === doc.key;
                                        return (
                                            <div key={doc.key} className={`border rounded-xl p-4 transition-colors ${uploaded ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200'}`}>
                                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${uploaded ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                                            <FileText className="w-5 h-5"/>
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-800 text-sm">{doc.label}</p>
                                                            {uploaded
                                                                ? <div className="flex flex-col gap-0.5">
                                                                <p className="text-xs font-medium text-emerald-700 truncate max-w-xs" title={uploaded.original_filename}>{uploaded.original_filename}</p>
                                                                <div className="flex items-center gap-2 text-[10px] text-emerald-600/70">
                                                                    <span className="uppercase">{uploaded.original_filename.split('.').pop()}</span>
                                                                    {uploaded.uploaded_at && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3"/> {new Date(uploaded.uploaded_at).toLocaleDateString()}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                                : <p className="text-xs text-slate-400">{doc.hint}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {isUploading && <Loader2 className="w-5 h-5 animate-spin text-brand-500"/>}
                                                        {uploaded && !isUploading && (
                                                            <>
                                                                {(uploaded.original_filename.toLowerCase().endsWith('.pdf') || uploaded.original_filename.toLowerCase().match(/\.(png|jpe?g)$/)) && (
                                                                    <button type="button" onClick={() => handleDownload(uploaded.id, uploaded.original_filename, 'view')} className="text-slate-500 hover:text-brand-600 transition-colors" title="View">
                                                                        <Eye className="w-4 h-4"/>
                                                                    </button>
                                                                )}
                                                                <button type="button" onClick={() => handleDownload(uploaded.id, uploaded.original_filename, 'download')} className="text-slate-500 hover:text-brand-600 transition-colors" title="Download">
                                                                    <Download className="w-4 h-4"/>
                                                                </button>
                                                                <button type="button" onClick={() => handleRemoveUpload(doc.key)}
                                                                    className="text-slate-400 hover:text-red-500 transition-colors ml-1" title="Remove">
                                                                    <X className="w-4 h-4"/>
                                                                </button>
                                                            </>
                                                        )}
                                                        <button type="button" disabled={isUploading}
                                                            onClick={() => fileInputRefs.current[doc.key]?.click()}
                                                            className={`saas-button text-xs py-1.5 px-3 ${uploaded ? 'saas-button-secondary' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'}`}>
                                                            <Upload className="w-3.5 h-3.5"/>{uploaded ? 'Replace' : 'Upload'}
                                                        </button>
                                                        <input ref={el => fileInputRefs.current[doc.key] = el}
                                                            type="file" className="hidden"
                                                            accept=".pdf,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.mp4"
                                                            onChange={e => { if (e.target.files[0]) handleFileUpload(doc.key, e.target.files[0]); e.target.value = ''; }}/>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── STEP 11 — REVIEW ── */}
                        {step === 11 && (
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-5">Review &amp; Submit</h2>
                                <p className="text-sm text-slate-500 mb-5">Review all information before submitting. Click Edit to go back and make changes.</p>
                                <div className="space-y-4">
                                    {[
                                        { title: 'Founder Profile', step: 3, content: `${regData.designation} · ${regData.exp || '—'} yrs experience · ${regData.bio?.slice(0,80) || 'No bio'}…` },
                                        { title: 'Startup Basics', step: 4, content: `${formData.name || '—'} · ${regData.tagline || 'No tagline'} · ${regData.startup_email || '—'}` },
                                        { title: 'Category & Stage', step: 5, content: `${formData.industry || '—'} · ${formData.stage || '—'}` },
                                        { title: 'Company Info', step: 6, content: `${regData.inc_status || 'Not set'} · ${regData.company_type || '—'} · ${regData.inc_date || '—'}` },
                                        { title: 'Location', step: 7, content: `${regData.address?.slice(0,60) || '—'}, ${regData.city || '—'}, ${regData.state || '—'}, ${regData.country || '—'} ${regData.pin || ''}` },
                                        { title: 'Team', step: 8, content: `${regData.team.length} founder(s): ${regData.team.map(m => m.name || '(unnamed)').join(', ')}` },
                                        { title: 'Startup Snapshot', step: 9, content: `Problem: ${regData.problem?.slice(0,80) || '—'}…` },
                                        { title: 'Documents', step: 10, content: `${Object.keys(uploads).length} document(s) uploaded` },
                                    ].map(row => (
                                        <div key={row.title} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex items-start justify-between gap-4">
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm mb-1">{row.title}</p>
                                                <p className="text-sm text-slate-500 leading-relaxed">{row.content}</p>
                                            </div>
                                            <button type="button" onClick={() => setStep(row.step)}
                                                className="text-brand-600 text-sm font-semibold hover:text-brand-700 shrink-0">Edit</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── STEP 12 — COMPLETE ── */}
                        {step === 12 && (
                            <div className="text-center py-10">
                                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-600"/>
                                </div>
                                <h2 className="text-3xl font-bold text-slate-900 mb-3">Registration Complete!</h2>
                                <p className="text-slate-500 text-lg mb-8 max-w-md mx-auto">
                                    Your startup profile for <strong className="text-slate-900">{formData.name}</strong> has been successfully submitted.
                                </p>
                                <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl max-w-sm mx-auto space-y-3 mb-8">
                                    <h3 className="font-bold text-slate-900 mb-4">Next Steps</h3>
                                    <Link to="/evaluate" className="saas-button saas-button-primary w-full justify-center">
                                        Start AI Evaluation
                                    </Link>
                                    <Link to="/dashboard" className="saas-button saas-button-secondary w-full justify-center mt-2">
                                        Go to Dashboard
                                    </Link>
                                </div>

                                <div className="max-w-2xl mx-auto text-left">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowEditList(!showEditList)}
                                        className="text-slate-500 hover:text-brand-600 text-sm font-medium flex items-center justify-center gap-2 mx-auto mb-6 transition-colors"
                                    >
                                        {showEditList ? 'Hide Edit Options' : 'Need to make changes? Edit Registration Steps'}
                                    </button>
                                    
                                    {showEditList && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                            {[
                                                { title: 'Founder Profile', step: 3, content: `${regData.designation} · ${regData.exp || '—'} yrs experience · ${regData.bio?.slice(0,80) || 'No bio'}…` },
                                                { title: 'Startup Basics', step: 4, content: `${formData.name || '—'} · ${regData.tagline || 'No tagline'} · ${regData.startup_email || '—'}` },
                                                { title: 'Category & Stage', step: 5, content: `${formData.industry || '—'} · ${formData.stage || '—'}` },
                                                { title: 'Company Info', step: 6, content: `${regData.inc_status || 'Not set'} · ${regData.company_type || '—'} · ${regData.inc_date || '—'}` },
                                                { title: 'Location', step: 7, content: `${regData.address?.slice(0,60) || '—'}, ${regData.city || '—'}, ${regData.state || '—'}, ${regData.country || '—'} ${regData.pin || ''}` },
                                                { title: 'Team', step: 8, content: `${regData.team.length} founder(s): ${regData.team.map(m => m.name || '(unnamed)').join(', ')}` },
                                                { title: 'Startup Snapshot', step: 9, content: `Problem: ${regData.problem?.slice(0,80) || '—'}…` },
                                                { title: 'Documents', step: 10, content: `${Object.keys(uploads).length} document(s) uploaded` },
                                            ].map(row => (
                                                <div key={row.title} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-sm mb-1">{row.title}</p>
                                                        <p className="text-sm text-slate-500 leading-relaxed">{row.content}</p>
                                                    </div>
                                                    <button type="button" onClick={() => setStep(row.step)}
                                                        className="saas-button saas-button-secondary text-xs py-1.5 px-3 shrink-0">Edit</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Navigation ── */}
                        {step !== 12 && (
                            <div className="pt-6 border-t border-slate-100 flex items-center justify-between mt-auto">
                                {step > 1
                                    ? <button type="button" onClick={goPrev} className="saas-button saas-button-secondary border-transparent bg-transparent hover:bg-slate-50 text-slate-600">
                                        <ChevronLeft className="w-4 h-4"/>Back
                                      </button>
                                    : <div/>}

                                {maxStep >= 12 && (
                                    <button type="button" onClick={() => setStep(12)} className="saas-button saas-button-secondary text-brand-600 border-brand-200 hover:bg-brand-50 mx-auto">
                                        Return to Registration Complete
                                    </button>
                                )}

                                {step < 11 && (
                                    <button type="submit" disabled={isSaving} className={`saas-button saas-button-primary ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                        {isSaving ? <><Loader2 className="w-4 h-4 animate-spin"/>Saving…</> : <>Continue<ChevronRight className="w-4 h-4"/></>}
                                    </button>
                                )}
                                {step === 11 && (
                                    <button type="button" disabled={isSaving}
                                        onClick={async () => { await handleSave(12, true); setStep(12); setMaxStep(12); }}
                                        className={`saas-button bg-emerald-600 hover:bg-emerald-700 text-white ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                        {isSaving ? <><Loader2 className="w-4 h-4 animate-spin"/>Submitting…</> : 'Submit Registration ✓'}
                                    </button>
                                )}
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
