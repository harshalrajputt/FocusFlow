import { useState, useEffect } from "react";
import { getProfile, upsertProfile } from "../../services/profileService";
import { regenerateSchedule } from "../../services/scheduleService";

const cardStyle = { background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' };
const inputStyle = {
    width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
    borderRadius: 12, color: 'var(--text-primary)', fontSize: 13, padding: '8px 12px',
    outline: 'none', transition: 'all 0.2s', fontFamily: 'inherit'
};

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function ProtectedBlocksManager({ onUpdateSuccess }) {
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Form states
    const [name, setName] = useState("");
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [repeat, setRepeat] = useState(DAYS_OF_WEEK); // Repeat all days by default

    const fetchBlocks = async () => {
        setLoading(true);
        try {
            const res = await getProfile();
            if (res.data?.data) {
                setBlocks(res.data.data.protectedBlocks || []);
            }
        } catch (err) {
            setError("Failed to load protected blocks.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlocks();
    }, []);

    const toggleDay = (day) => {
        setRepeat(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const saveBlocks = async (updatedBlocks, successMsg) => {
        setSaving(true);
        setError("");
        setSuccess("");
        try {
            await upsertProfile({ protectedBlocks: updatedBlocks });
            setBlocks(updatedBlocks);
            setSuccess(successMsg);
            await regenerateSchedule();
            if (onUpdateSuccess) onUpdateSuccess();
            setTimeout(() => setSuccess(""), 4000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update protected blocks.");
        } finally {
            setSaving(false);
        }
    };

    const handleAddBlock = async (e) => {
        e.preventDefault();
        if (!name.trim() || !start || !end) {
            setError("All fields are required.");
            return;
        }
        const newBlock = { name: name.trim(), start, end, repeat, isLocked: true };
        await saveBlocks([...blocks, newBlock], "Habit protected! Regenerating baseline...");
        // Reset form on success
        if (!error) { setName(""); setStart(""); setEnd(""); setRepeat(DAYS_OF_WEEK); }
    };

    const handleDeleteBlock = async (indexToDelete) => {
        if (!window.confirm("Are you sure you want to delete this protected activity?")) return;
        await saveBlocks(blocks.filter((_, idx) => idx !== indexToDelete), "Block deleted. Regenerating baseline...");
    };

    if (loading) {
        return <p className="text-xs text-[var(--text-muted)]">Loading protected habits...</p>;
    }

    return (
        <div className="space-y-4">
            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">{error}</p>}
            {success && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">{success}</p>}

            {/* List current blocks */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {blocks.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] italic">No protected leisure blocks defined. Lock some personal time!</p>
                ) : (
                    blocks.map((block, idx) => (
                        <div 
                            key={block._id || idx}
                            className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] transition-all hover:border-[var(--border-hover)]"
                        >
                            <div className="min-w-0">
                                <h4 className="text-xs font-bold text-[var(--text-primary)] truncate flex items-center gap-1.5">
                                    <span>🌴</span> {block.name}
                                </h4>
                                <p className="text-[10px] font-semibold text-[var(--text-muted)] mt-0.5">
                                    {block.start} - {block.end} • {block.repeat?.length === 7 ? "Everyday" : block.repeat?.map(d => d.slice(0, 3)).join(", ")}
                                </p>
                            </div>
                            <button
                                onClick={() => handleDeleteBlock(idx)}
                                disabled={saving}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-colors border-none bg-transparent cursor-pointer disabled:opacity-50"
                                title="Delete Block"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Add block form */}
            <form onSubmit={handleAddBlock} className="rounded-xl p-4 border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-3">
                <h4 className="text-xs font-bold text-[var(--text-primary)]">Protect a New Activity</h4>
                
                <div>
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Habit Name</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Gym, Gaming, Friends Dinner" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        required
                        style={inputStyle}
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Start Time</label>
                        <input 
                            type="time" 
                            value={start} 
                            onChange={e => setStart(e.target.value)} 
                            required
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label className="block text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">End Time</label>
                        <input 
                            type="time" 
                            value={end} 
                            onChange={e => setEnd(e.target.value)} 
                            required
                            style={inputStyle}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Repeat Days</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {DAYS_OF_WEEK.map(day => {
                            const isSelected = repeat.includes(day);
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleDay(day)}
                                    className={`px-2 py-1 rounded-lg text-[9px] font-semibold border transition-all cursor-pointer ${
                                        isSelected 
                                        ? 'bg-[var(--accent-glow)] border-[var(--accent-color)] text-[var(--accent-color)]' 
                                        : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-muted)]'
                                    }`}
                                >
                                    {day.slice(0, 3)}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-xs font-bold transition-all duration-200 cursor-pointer disabled:opacity-50"
                    style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 12px var(--accent-glow)' }}
                >
                    {saving ? "Locking..." : "Protect & Lock Block 🔒"}
                </button>
            </form>
        </div>
    );
}
