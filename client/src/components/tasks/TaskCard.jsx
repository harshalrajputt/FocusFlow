const PRIORITY_CONFIG = {
    High:   { color: '#f87171', bg: 'rgba(239,68,68,0.12)',    border: 'rgba(239,68,68,0.25)',    dot: '#ef4444' },
    Medium: { color: '#fbbf24', bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.25)',   dot: '#f59e0b' },
    Low:    { color: '#34d399', bg: 'rgba(16,185,129,0.12)',   border: 'rgba(16,185,129,0.25)',   dot: '#10b981' },
};

const STATUS_CONFIG = {
    "Pending":     { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.2)' },
    "In Progress": { color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.25)' },
    "Completed":   { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)' },
};

const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    const fmt = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { fmt, diff, isOverdue: diff < 0 };
};

export default function TaskCard({ task, onEdit, onDelete, onStatusChange }) {
    const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Medium;
    const status   = STATUS_CONFIG[task.status]     || STATUS_CONFIG["Pending"];
    const due      = formatDate(task.dueDate);

    const isCompleted = task.status === "Completed";

    const cycleStatus = () => {
        const cycle = { "Pending": "In Progress", "In Progress": "Completed", "Completed": "Pending" };
        onStatusChange(task._id, cycle[task.status]);
    };

    return (
        <div
            className="group rounded-xl p-4 transition-all duration-200"
            style={{
                background: isCompleted ? 'rgba(13,21,38,0.4)' : '#0d1526',
                border: '1px solid rgba(148,163,184,0.07)',
                opacity: isCompleted ? 0.7 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(148,163,184,0.14)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(148,163,184,0.07)'; e.currentTarget.style.transform = ''; }}
        >
            <div className="flex items-start gap-3">
                {/* Status toggle checkbox */}
                <button
                    onClick={cycleStatus}
                    className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200 border-2"
                    style={{
                        borderColor: isCompleted ? '#10b981' : 'rgba(148,163,184,0.25)',
                        background: isCompleted ? '#10b981' : 'transparent',
                    }}
                    title="Cycle status"
                >
                    {isCompleted && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h3
                            className="text-sm font-semibold leading-snug"
                            style={{ color: isCompleted ? '#475569' : '#f1f5f9', textDecoration: isCompleted ? 'line-through' : 'none' }}
                        >
                            {task.title}
                        </h3>

                        {/* Actions — show on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                                onClick={() => onEdit(task)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-700/50 transition-all"
                                title="Edit"
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button
                                onClick={() => onDelete(task._id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Delete"
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                        </div>
                    </div>

                    {/* Description */}
                    {task.description && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{task.description}</p>
                    )}

                    {/* Badges row */}
                    <div className="flex items-center flex-wrap gap-2 mt-3">
                        {/* Priority */}
                        <span
                            className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: priority.color, background: priority.bg, border: `1px solid ${priority.border}` }}
                        >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: priority.dot }} />
                            {task.priority}
                        </span>

                        {/* Status */}
                        <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: status.color, background: status.bg, border: `1px solid ${status.border}` }}
                        >
                            {task.status}
                        </span>

                        {/* Due date */}
                        {due && (
                            <span
                                className="text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                                style={{
                                    color: due.isOverdue ? '#f87171' : '#64748b',
                                    background: due.isOverdue ? 'rgba(239,68,68,0.08)' : 'rgba(148,163,184,0.06)',
                                    border: `1px solid ${due.isOverdue ? 'rgba(239,68,68,0.2)' : 'rgba(148,163,184,0.1)'}`,
                                }}
                            >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                {due.isOverdue ? `Overdue · ${due.fmt}` : due.diff === 0 ? 'Due today' : `Due ${due.fmt}`}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
