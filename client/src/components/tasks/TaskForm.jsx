import { useState, useEffect } from "react";

const inputStyle = {
    width: '100%',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 12,
    color: 'var(--text-primary)',
    fontSize: 14,
    padding: '10px 14px',
    outline: 'none',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
};

const InputField = ({ label, required, children }) => (
    <div>
        <label
            className="block text-[11px] font-semibold uppercase tracking-widest mb-2 text-[var(--text-muted)]"
        >
            {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
        </label>
        {children}
    </div>
);

export default function TaskForm({ initialData, onSubmit, onCancel, loading }) {
    const [form, setForm] = useState({
        title:       "",
        description: "",
        priority:    "Medium",
        skipCost:    "Medium",
        flexibility: "Flexible",
        status:      "Pending",
        dueDate:     "",
        shareWithPod: true,
    });

    useEffect(() => {
        if (initialData) {
            setForm({
                title:       initialData.title       || "",
                description: initialData.description || "",
                priority:    initialData.priority    || "Medium",
                skipCost:    initialData.skipCost    || "Medium",
                flexibility: initialData.flexibility || "Flexible",
                status:      initialData.status      || "Pending",
                dueDate:     initialData.dueDate
                    ? new Date(initialData.dueDate).toISOString().split("T")[0]
                    : "",
                shareWithPod: initialData.shareWithPod !== undefined ? initialData.shareWithPod : true,
            });
        }
    }, [initialData]);

    const handleChange = (e) =>
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        onSubmit({
            ...form,
            dueDate: form.dueDate || null,
        });
    };

    const focusStyle = (e) => {
        e.target.style.borderColor = 'var(--accent-color)';
        e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)';
    };
    const blurStyle = (e) => {
        e.target.style.borderColor = 'var(--border-color)';
        e.target.style.boxShadow = '';
    };

    const PRIORITIES = ["Low", "Medium", "High", "Critical"];
    const STATUSES   = ["Pending", "In Progress", "Completed"];

    const priorityColors = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444', Critical: '#7c3aed' };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">

            {/* Title */}
            <InputField label="Task Title" required>
                <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="What needs to get done?"
                    required
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                />
            </InputField>

            {/* Description */}
            <InputField label="Description">
                <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Add more details... (optional)"
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                />
            </InputField>

            {/* Priority + Status row */}
            <div className="grid grid-cols-2 gap-4">
                <InputField label="Priority">
                    <div className="flex gap-1.5 flex-wrap">
                        {PRIORITIES.map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                                className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200"
                                style={form.priority === p
                                    ? { background: `${priorityColors[p]}20`, color: priorityColors[p], border: `1px solid ${priorityColors[p]}50` }
                                    : { background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }
                                }
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </InputField>

                <InputField label="Status">
                    <select
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                        onFocus={focusStyle}
                        onBlur={blurStyle}
                    >
                        {STATUSES.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </InputField>
            </div>

            {/* Skip Cost + Flexibility row */}
            <div className="grid grid-cols-2 gap-4">
                <InputField label="Skip Cost (Consequence)">
                    <div className="flex gap-1.5">
                        {["Low", "Medium", "High"].map(sc => (
                            <button
                                key={sc}
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, skipCost: sc }))}
                                className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200"
                                style={form.skipCost === sc
                                    ? { background: 'var(--accent-glow)', color: 'var(--accent-color)', border: '1px solid var(--accent-color)' }
                                    : { background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }
                                }
                            >
                                {sc}
                              </button>
                          ))}
                      </div>
                  </InputField>

                  <InputField label="Flexibility (Movement)">
                      <select
                          name="flexibility"
                          value={form.flexibility}
                          onChange={handleChange}
                          style={{ ...inputStyle, cursor: 'pointer' }}
                          onFocus={focusStyle}
                          onBlur={blurStyle}
                      >
                          {["Flexible", "SemiFlexible", "Fixed"].map(f => (
                              <option key={f} value={f}>{f}</option>
                          ))}
                      </select>
                  </InputField>
            </div>

            {/* Due Date */}
            <InputField label="Due Date">
                <input
                    type="date"
                    name="dueDate"
                    value={form.dueDate}
                    onChange={handleChange}
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                />
            </InputField>

            {/* Share with Pod */}
            <div className="flex items-center gap-2.5 py-1">
                <input
                    type="checkbox"
                    id="shareWithPod"
                    name="shareWithPod"
                    checked={form.shareWithPod}
                    onChange={(e) => setForm(prev => ({ ...prev, shareWithPod: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-900"
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                />
                <label htmlFor="shareWithPod" className="text-sm text-[var(--text-primary)] cursor-pointer select-none">
                    Share session completions with my Pod (Public details)
                </label>
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--border-hover)] cursor-pointer"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading || !form.title.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-all"
                    style={{
                        background: 'var(--accent-gradient)',
                        boxShadow: '0 4px 16px var(--accent-glow)',
                        opacity: loading || !form.title.trim() ? 0.6 : 1,
                        cursor: loading || !form.title.trim() ? 'not-allowed' : 'pointer',
                    }}
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                                <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                            Saving…
                        </>
                    ) : (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                            {initialData ? "Save Changes" : "Create Task"}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
