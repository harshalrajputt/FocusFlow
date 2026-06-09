import { useEffect } from "react";
import TaskForm from "./TaskForm";

export default function TaskModal({ isOpen, editTask, onSubmit, onClose, loading }) {
    // Close on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        if (isOpen) document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(2,8,23,0.8)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="w-full max-w-lg animate-fade-in-up"
                style={{
                    background: '#0d1526',
                    border: '1px solid rgba(148,163,184,0.1)',
                    borderRadius: 20,
                    boxShadow: '0 32px 64px rgba(0,0,0,0.7)',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4"
                    style={{ borderBottom: '1px solid rgba(148,163,184,0.07)' }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}
                        >
                            {editTask ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            )}
                        </div>
                        <h2 className="text-slate-100 text-base font-bold">
                            {editTask ? "Edit Task" : "Create New Task"}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 transition-all"
                        onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(148,163,184,0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = ''; e.currentTarget.style.background = ''; }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>

                {/* Form */}
                <div className="p-6">
                    <TaskForm
                        initialData={editTask}
                        onSubmit={onSubmit}
                        onCancel={onClose}
                        loading={loading}
                    />
                </div>
            </div>
        </div>
    );
}
