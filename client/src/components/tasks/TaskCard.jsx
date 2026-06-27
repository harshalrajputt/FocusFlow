const PRIORITY_CONFIG = {
    Critical: { color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.25)', dot: '#7c3aed' },
    High:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    border: 'rgba(239,68,68,0.25)',    dot: '#ef4444' },
    Medium: { color: '#d97706', bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.25)',   dot: '#d97706' },
    Low:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)',   border: 'rgba(16,185,129,0.25)',   dot: '#10b981' },
};

const STATUS_CONFIG = {
    "Pending":     { color: 'var(--text-muted)', bg: 'var(--bg-primary)', border: 'var(--border-color)' },
    "In Progress": { color: 'var(--accent-color)', bg: 'var(--accent-glow)', border: 'var(--border-color)' },
    "Completed":   { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
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
                background: isCompleted ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                opacity: isCompleted ? 0.7 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = ''; }}
        >
            <div className="flex items-start gap-3">
                {/* Status toggle checkbox */}
                <button
                    onClick={cycleStatus}
                    className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200 border-2 cursor-pointer"
                    style={{
                        borderColor: isCompleted ? '#10b981' : 'var(--border-hover)',
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
                            style={{ color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isCompleted ? 'line-through' : 'none' }}
                        >
                            {task.title}
                        </h3>

                        {/* Actions — show on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                                onClick={() => onEdit(task)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer border-none bg-transparent"
                                title="Edit"
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button
                                onClick={() => onDelete(task._id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer border-none bg-transparent"
                                title="Delete"
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                        </div>
                    </div>

                    {/* Description */}
                    {task.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{task.description}</p>
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

                        {/* Skip Cost */}
                        {task.skipCost && (
                            <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{
                                    color: task.skipCost === "High" ? "#ef4444" : task.skipCost === "Medium" ? "#d97706" : "#10b981",
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                Cost: {task.skipCost}
                            </span>
                        )}

                        {/* Flexibility */}
                        {task.flexibility && (
                            <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{
                                    color: task.flexibility === "Fixed" ? "#38bdf8" : "var(--text-muted)",
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                {task.flexibility}
                            </span>
                        )}

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
                                    color: due.isOverdue ? '#ef4444' : 'var(--text-muted)',
                                    background: due.isOverdue ? 'rgba(239,68,68,0.08)' : 'var(--bg-primary)',
                                    border: `1px solid ${due.isOverdue ? 'rgba(239,68,68,0.2)' : 'var(--border-color)'}`,
                                }}
                            >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                {due.isOverdue ? `Overdue · ${due.fmt}` : due.diff === 0 ? 'Due today' : `Due ${due.fmt}`}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
