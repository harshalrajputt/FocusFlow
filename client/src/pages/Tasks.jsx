import { useState, useEffect, useCallback } from "react";
import TaskList  from "../components/tasks/TaskList";
import TaskModal from "../components/tasks/TaskModal";
import { getTasks, createTask, updateTask, deleteTask } from "../services/taskService";

const STATUS_FILTERS = ["All", "Pending", "In Progress", "Completed"];
const PRIORITY_FILTERS = ["All Priorities", "High", "Medium", "Low"];

const cardStyle = { background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' };

// Confirmation dialog
function ConfirmDialog({ open, onConfirm, onCancel }) {
    if (!open) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(2,8,23,0.7)', backdropFilter: 'blur(8px)' }}
        >
            <div
                className="w-full max-w-sm animate-fade-in-up rounded-2xl p-6"
                style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(239,68,68,0.2)', boxShadow: 'var(--shadow-lg)' }}
            >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.1)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </div>
                <h3 className="text-slate-900 dark:text-slate-100 font-bold text-center text-lg mb-1">Delete Task?</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-6">This action cannot be undone.</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all cursor-pointer"
                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 4px 16px rgba(239,68,68,0.3)' }}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

// Toast notification
function Toast({ toast }) {
    if (!toast) return null;
    const colors = {
        success: { bg: 'var(--accent-glow)', border: 'var(--accent-color)', color: 'var(--accent-color)' },
        error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)',  color: '#f87171' },
    };
    const c = colors[toast.type] || colors.success;
    return (
        <div
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in-up"
            style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color, backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxWidth: 320 }}
        >
            {toast.type === 'success'
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            }
            {toast.message}
        </div>
    );
}

export default function Tasks() {
    const [tasks,      setTasks]      = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [saving,     setSaving]     = useState(false);
    const [modalOpen,  setModalOpen]  = useState(false);
    const [editTask,   setEditTask]   = useState(null);
    const [deleteId,   setDeleteId]   = useState(null);
    const [toast,      setToast]      = useState(null);
    const [search,     setSearch]     = useState("");
    const [statusFilter,   setStatusFilter]   = useState("All");
    const [priorityFilter, setPriorityFilter] = useState("All Priorities");

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter !== "All")             params.status   = statusFilter;
            if (priorityFilter !== "All Priorities") params.priority = priorityFilter;
            const res = await getTasks(params);
            setTasks(res.data.tasks || []);
        } catch {
            showToast("Failed to load tasks", "error");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, priorityFilter]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    // Client-side search filter
    const filtered = tasks.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(search.toLowerCase())
    );

    const handleOpenCreate = () => { setEditTask(null); setModalOpen(true); };
    const handleOpenEdit   = (task) => { setEditTask(task); setModalOpen(true); };
    const handleCloseModal = () => { setModalOpen(false); setEditTask(null); };

    const handleSubmit = async (formData) => {
        setSaving(true);
        try {
            if (editTask) {
                await updateTask(editTask._id, formData);
                showToast("Task updated successfully");
            } else {
                await createTask(formData);
                showToast("Task created successfully");
            }
            handleCloseModal();
            fetchTasks();
        } catch (err) {
            showToast(err.response?.data?.message || "Something went wrong", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            await updateTask(id, { status: newStatus });
            setTasks(prev => prev.map(t => t._id === id ? { ...t, status: newStatus } : t));
        } catch {
            showToast("Failed to update status", "error");
        }
    };

    const handleDeleteConfirm = async () => {
        try {
            await deleteTask(deleteId);
            setTasks(prev => prev.filter(t => t._id !== deleteId));
            showToast("Task deleted");
        } catch {
            showToast("Failed to delete task", "error");
        } finally {
            setDeleteId(null);
        }
    };

    // Stats
    const stats = {
        total:      tasks.length,
        completed:  tasks.filter(t => t.status === "Completed").length,
        inProgress: tasks.filter(t => t.status === "In Progress").length,
        overdue:    tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Completed").length,
    };

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Tasks</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        {stats.total > 0
                            ? `${stats.completed} of ${stats.total} tasks completed`
                            : "Manage and track your work items"}
                    </p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer"
                    style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 16px var(--accent-glow)' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px var(--accent-glow)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px var(--accent-glow)'; e.currentTarget.style.transform = ''; }}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    New Task
                </button>
            </div>

            {/* ── Mini Stats ── */}
            {tasks.length > 0 && (
                <div className="grid grid-cols-4 gap-3 animate-fade-in-up delay-1">
                    {[
                        { label: "Total",       val: stats.total,      color: 'var(--text-primary)' },
                        { label: "In Progress", val: stats.inProgress, color: 'var(--accent-color)' },
                        { label: "Completed",   val: stats.completed,  color: '#10b981' },
                        { label: "Overdue",     val: stats.overdue,    color: stats.overdue > 0 ? '#f87171' : 'var(--text-muted)' },
                    ].map(s => (
                        <div key={s.label} className="rounded-xl p-3 text-center" style={cardStyle}>
                            <p className="text-xl font-bold" style={{ color: s.color }}>{s.val}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Search + Priority filter ── */}
            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up delay-2">
                <div className="relative flex-1">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input
                        type="text"
                        placeholder="Search tasks…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-slate-800 dark:text-slate-200 text-sm placeholder-slate-500 outline-none transition-all"
                        style={cardStyle}
                        onFocus={e => { e.target.style.borderColor = 'var(--accent-color)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
                        onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = ''; }}
                    />
                </div>
                <select
                    value={priorityFilter}
                    onChange={e => setPriorityFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl text-slate-800 dark:text-slate-400 text-sm font-medium outline-none transition-all"
                    style={{ ...cardStyle, cursor: 'pointer', minWidth: 150, fontFamily: 'inherit' }}
                >
                    {PRIORITY_FILTERS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            {/* ── Status Tabs ── */}
            <div className="flex gap-1 rounded-xl p-1 animate-fade-in-up delay-3" style={cardStyle}>
                {STATUS_FILTERS.map(f => (
                    <button
                        key={f}
                        onClick={() => setStatusFilter(f)}
                        className="flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                        style={statusFilter === f
                            ? { background: 'var(--accent-glow)', color: 'var(--accent-color)', border: '1px solid var(--border-color)' }
                            : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' }
                        }
                    >
                        {f}
                        {f !== "All" && tasks.length > 0 && (
                            <span className="ml-1.5 opacity-60">
                                ({tasks.filter(t => t.status === f).length})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Task List ── */}
            <div className="animate-fade-in-up delay-4">
                <TaskList
                    tasks={filtered}
                    loading={loading}
                    onEdit={handleOpenEdit}
                    onDelete={setDeleteId}
                    onStatusChange={handleStatusChange}
                />
            </div>

            {/* ── Modals ── */}
            <TaskModal
                isOpen={modalOpen}
                editTask={editTask}
                onSubmit={handleSubmit}
                onClose={handleCloseModal}
                loading={saving}
            />

            <ConfirmDialog
                open={!!deleteId}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteId(null)}
            />

            <Toast toast={toast} />
        </div>
    );
}