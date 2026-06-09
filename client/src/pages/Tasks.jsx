import { useState } from "react";

const cardStyle = { background: '#0d1526', border: '1px solid rgba(148,163,184,0.07)' };
const filterTabs = ["All", "Today", "In Progress", "Completed"];

const Tasks = () => {
    const [active, setActive] = useState(0);

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">Tasks</h1>
                    <p className="text-slate-600 text-sm mt-1">Manage and track your work items</p>
                </div>
                <button
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-200"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(124,58,237,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.3)'; e.currentTarget.style.transform = ''; }}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    New Task
                </button>
            </div>

            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up delay-1">
                <div className="relative flex-1">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input
                        type="text" placeholder="Search tasks…"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-slate-200 text-sm placeholder-slate-600 outline-none transition-all"
                        style={cardStyle}
                        onFocus={e => { e.target.style.borderColor = 'rgba(124,58,237,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)'; }}
                        onBlur={e => { e.target.style.borderColor = 'rgba(148,163,184,0.07)'; e.target.style.boxShadow = ''; }}
                    />
                </div>
                <button
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-500 text-sm font-medium transition-all"
                    style={cardStyle}
                    onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.14)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = ''; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.07)'; }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                    Filter
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-xl p-1 animate-fade-in-up delay-2" style={cardStyle}>
                {filterTabs.map((tab, i) => (
                    <button
                        key={tab}
                        onClick={() => setActive(i)}
                        className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200"
                        style={active === i
                            ? { background: 'rgba(124,58,237,0.18)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.25)' }
                            : { background: 'transparent', color: '#475569', border: '1px solid transparent' }
                        }
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Task List / Empty State */}
            <div className="rounded-2xl overflow-hidden animate-fade-in-up delay-3" style={cardStyle}>
                <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.08)' }}
                    >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    </div>
                    <h3 className="text-slate-300 font-semibold text-lg mb-1">No tasks yet</h3>
                    <p className="text-slate-600 text-sm max-w-xs">
                        Add your first task to start tracking your productivity and stay focused.
                    </p>
                    <button
                        className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-200"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(124,58,237,0.5)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.3)'}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Add First Task
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Tasks;