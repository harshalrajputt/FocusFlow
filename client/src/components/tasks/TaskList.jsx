import TaskCard from "./TaskCard";

const cardStyle = { background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' };

export default function TaskList({ tasks, loading, onEdit, onDelete, onStatusChange }) {
    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div
                        key={i}
                        className="rounded-xl p-4 animate-pulse"
                        style={cardStyle}
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full mt-0.5 flex-shrink-0" style={{ background: 'rgba(148,163,184,0.1)' }} />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 rounded" style={{ background: 'rgba(148,163,184,0.08)', width: '60%' }} />
                                <div className="h-3 rounded" style={{ background: 'rgba(148,163,184,0.05)', width: '40%' }} />
                                <div className="flex gap-2 mt-3">
                                    <div className="h-5 w-14 rounded-full" style={{ background: 'rgba(148,163,184,0.06)' }} />
                                    <div className="h-5 w-16 rounded-full" style={{ background: 'rgba(148,163,184,0.06)' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: 'rgba(148,163,184,0.04)', border: '1px solid rgba(148,163,184,0.08)' }}
                >
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 11 12 14 22 4"/>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                </div>
                <h3 className="text-slate-400 font-semibold text-base mb-1">No tasks found</h3>
                <p className="text-slate-700 text-sm max-w-xs">
                    No tasks match your current filter. Try changing the filter or add a new task.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {tasks.map((task, i) => (
                <div key={task._id} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.04}s` }}>
                    <TaskCard
                        task={task}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onStatusChange={onStatusChange}
                    />
                </div>
            ))}
        </div>
    );
}
