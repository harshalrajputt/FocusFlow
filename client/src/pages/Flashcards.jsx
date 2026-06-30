import { useState, useEffect } from "react";
import { getTasks } from "../services/taskService";
import { transformNotes as apiTransformNotes } from "../services/aiService";
import TiltContainer from "../components/layout/TiltContainer";

const cardStyle = { background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', backdropFilter: 'blur(20px)' };
const inputStyle = {
    width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
    borderRadius: 12, color: 'var(--text-primary)', fontSize: 14, padding: '12px 16px',
    outline: 'none', transition: 'all 0.2s',
};

export default function Flashcards() {
    const [tasks, setTasks] = useState([]);
    const [selectedTaskId, setSelectedTaskId] = useState("");
    const [notesText, setNotesText] = useState("");
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState("");

    // Flashcard lists and summaries
    const [studyData, setStudyData] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("focusflow_flashcards") || "{}");
        } catch {
            return {};
        }
    });

    // Review session states
    const [activeTaskId, setActiveTaskId] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        getTasks().then(res => {
            setTasks(res.data.tasks || []);
            if (res.data.tasks?.length > 0) {
                setSelectedTaskId(res.data.tasks[0]._id);
            }
        }).catch(() => {});
    }, []);

    const [groqApiKey, setGroqApiKey] = useState(() => {
        return localStorage.getItem("focusflow_groq_key") || "";
    });

    const [attachedFile, setAttachedFile] = useState(null);
    const [rawFile, setRawFile] = useState(null);
    const [cardCount, setCardCount] = useState(3);

    // Save studyData to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem("focusflow_flashcards", JSON.stringify(studyData));
    }, [studyData]);

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setAttachedFile({ name: file.name, size: file.size, type: file.type });
        setRawFile(file);
        setError("");

        if (file.type === "text/plain") {
            const reader = new FileReader();
            reader.onload = (event) => {
                setNotesText(event.target.result);
            };
            reader.readAsText(file);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!selectedTaskId) {
            setError("Please select a task first.");
            return;
        }
        if (!notesText.trim() && !rawFile) {
            setError("Please paste some study notes or upload a study file (PDF/TXT).");
            return;
        }

        setGenerating(true);
        setError("");

        try {
            let fileData = null;
            if (rawFile) {
                const base64 = await fileToBase64(rawFile);
                fileData = {
                    name: rawFile.name,
                    data: base64
                };
            }

            const task = tasks.find(t => t._id === selectedTaskId);
            const title = task?.title || "Study Task";

            const res = await apiTransformNotes({ 
                notes: notesText, 
                taskTitle: title, 
                cardCount: Number(cardCount),
                file: fileData
            }, groqApiKey);

            if (res.data.success && res.data.data) {
                const { summary, cards } = res.data.data;
                
                // Add spaced repetition parameters to each card on initialize
                const initializedCards = (cards || []).map(c => ({
                    ...c,
                    interval: 1,
                    ease: 2.5,
                    nextReview: new Date().toISOString()
                }));

                setStudyData(prev => ({
                    ...prev,
                    [selectedTaskId]: {
                        summary: summary || "No summary returned.",
                        cards: initializedCards
                    }
                }));

                setNotesText("");
                setAttachedFile(null);
                setRawFile(null);
            } else {
                setError("Failed to extract cards. Please check your inputs.");
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Failed to parse notes with Groq API.";
            setError(msg);
        } finally {
            setGenerating(false);
        }
    };

    // SM-2 Spaced Repetition logic
    const handleGradeCard = (grade) => {
        const currentTaskData = studyData[activeTaskId];
        if (!currentTaskData) return;

        const updatedCards = [...currentTaskData.cards];
        const card = { ...updatedCards[currentIndex] };

        // Grade scale:
        // 'hard' (0.5x interval)
        // 'good' (1.5x interval)
        // 'easy' (2.5x interval)
        let multiplier = 1;
        if (grade === "hard") {
            card.interval = 1;
            card.ease = Math.max(1.3, card.ease - 0.2);
        } else if (grade === "good") {
            card.interval = Math.round(card.interval * card.ease);
            card.ease = card.ease;
        } else if (grade === "easy") {
            card.interval = Math.round(card.interval * card.ease * 1.5);
            card.ease = card.ease + 0.15;
        }

        const next = new Date();
        next.setDate(next.getDate() + card.interval);
        card.nextReview = next.toISOString();

        updatedCards[currentIndex] = card;

        setStudyData(prev => ({
            ...prev,
            [activeTaskId]: {
                ...prev[activeTaskId],
                cards: updatedCards
            }
        }));

        // Move to next card or reset review
        setIsFlipped(false);
        setTimeout(() => {
            if (currentIndex + 1 < updatedCards.length) {
                setCurrentIndex(prev => prev + 1);
            } else {
                // Done review!
                setActiveTaskId("");
                setCurrentIndex(0);
            }
        }, 200);
    };

    const handleStartReview = (taskId) => {
        setActiveTaskId(taskId);
        setCurrentIndex(0);
        setIsFlipped(false);
    };

    const activeTaskData = studyData[activeTaskId];
    const cardsToReview = activeTaskData?.cards || [];
    const currentCard = cardsToReview[currentIndex];

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-8 animate-fade-in">
            {/* Header */}
            <div className="animate-fade-in-up">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
                    AI Study Tools & Flashcards 🪄
                </h1>
                <p className="text-[var(--text-muted)] text-sm mt-1">
                    Paste notes to auto-generate flashcards and study summaries with spaced-repetition logic.
                </p>
            </div>

            {/* REVIEW VIEW SCREEN */}
            {activeTaskId && currentCard ? (
                <div className="animate-fade-in flex flex-col items-center justify-center py-10 max-w-lg mx-auto space-y-6">
                    <div className="w-full flex justify-between text-xs text-[var(--text-muted)]">
                        <span>Reviewing: {tasks.find(t => t._id === activeTaskId)?.title || "Task"}</span>
                        <span>Card {currentIndex + 1} of {cardsToReview.length}</span>
                    </div>

                    {/* Card container */}
                    <div 
                        onClick={() => setIsFlipped(!isFlipped)}
                        className="w-full h-64 rounded-2xl p-6 cursor-pointer flex flex-col justify-center items-center text-center relative border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-lg hover:border-sky-500 transition-all duration-300 transform"
                        style={{
                            perspective: 1000
                        }}
                    >
                        {!isFlipped ? (
                            <div className="space-y-4">
                                <span className="text-3xl">❓</span>
                                <p className="text-lg font-bold text-[var(--text-primary)]">{currentCard.front}</p>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Click to reveal answer</span>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <span className="text-3xl">💡</span>
                                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{currentCard.back}</p>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Click to see question</span>
                            </div>
                        )}
                    </div>

                    {/* SM-2 Buttons */}
                    {isFlipped && (
                        <div className="w-full grid grid-cols-3 gap-3 animate-fade-in">
                            <button
                                onClick={() => handleGradeCard("hard")}
                                className="py-2.5 rounded-xl border border-red-500/25 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-semibold cursor-pointer transition"
                            >
                                Hard (Retry ⏳)
                            </button>
                            <button
                                onClick={() => handleGradeCard("good")}
                                className="py-2.5 rounded-xl border border-sky-500/25 bg-sky-500/5 hover:bg-sky-500/10 text-sky-400 text-xs font-semibold cursor-pointer transition"
                            >
                                Good (Keep 👍)
                            </button>
                            <button
                                onClick={() => handleGradeCard("easy")}
                                className="py-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 text-xs font-semibold cursor-pointer transition"
                            >
                                Easy (Master 🚀)
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => setActiveTaskId("")}
                        className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition border-none bg-transparent cursor-pointer"
                    >
                        Quit Review Session
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-3 gap-6">
                    {/* Notes pasting Column */}
                    <div className="md:col-span-2 space-y-6 animate-fade-in-up delay-1">
                        <TiltContainer className="rounded-2xl p-6" style={cardStyle}>
                            <form onSubmit={handleGenerate} className="space-y-4">
                                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    <span>🪄</span> Paste Lecture Slides / Study Notes
                                </h3>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-505 text-sky-500 mb-2">
                                        Groq API Key
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="gsk_..."
                                        value={groqApiKey}
                                        onChange={e => {
                                            setGroqApiKey(e.target.value);
                                            localStorage.setItem("focusflow_groq_key", e.target.value);
                                        }}
                                        style={inputStyle}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Target Study Task</label>
                                    <select
                                        value={selectedTaskId}
                                        onChange={e => setSelectedTaskId(e.target.value)}
                                        style={inputStyle}
                                        required
                                    >
                                        <option value="">-- Select a Task --</option>
                                        {tasks.map(t => (
                                            <option key={t._id} value={t._id}>{t.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Number of Flashcards (1 - 15)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="15"
                                        value={cardCount}
                                        onChange={e => setCardCount(Math.max(1, Math.min(15, Number(e.target.value))))}
                                        style={inputStyle}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                                        Upload Study Document (PDF / TXT)
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-[var(--border-color)] hover:border-sky-400 rounded-xl p-4 bg-[var(--bg-primary)] cursor-pointer transition">
                                            <span className="text-xl">📄</span>
                                            <span className="text-xs text-[var(--text-secondary)] mt-1 font-semibold">
                                                {attachedFile ? attachedFile.name : "Select PDF / TXT Slide Notes"}
                                            </span>
                                            <input
                                                type="file"
                                                accept=".pdf,.txt,.doc,.docx"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                            />
                                        </label>
                                        {attachedFile && (
                                            <button
                                                type="button"
                                                onClick={() => { setAttachedFile(null); setRawFile(null); }}
                                                className="px-3.5 py-2.5 rounded-xl border border-red-500/25 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-semibold cursor-pointer transition"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Lecture Notes Text</label>
                                    <textarea
                                        rows={6}
                                        value={notesText}
                                        onChange={e => setNotesText(e.target.value)}
                                        placeholder="Paste paragraphs, formula sheets, bullet points, or slides copy here..."
                                        style={inputStyle}
                                        required={!attachedFile}
                                    />
                                </div>

                                {error && <p className="text-red-400 text-xs font-semibold">{error}</p>}

                                <button
                                    type="submit"
                                    disabled={generating}
                                    className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
                                    style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 12px var(--accent-glow)' }}
                                >
                                    {generating ? "AI Extracting Study Materials..." : "AI-Transform Notes 🪄"}
                                </button>
                            </form>
                        </TiltContainer>
                    </div>

                    {/* Generated study hubs lists */}
                    <div className="space-y-6 animate-fade-in-up delay-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Your AI Study Hubs</p>

                        {Object.keys(studyData).length === 0 ? (
                            <div className="p-6 rounded-2xl text-center border border-dashed border-[var(--border-color)]">
                                <p className="text-xs text-[var(--text-muted)]">No flashcards generated yet.</p>
                                <p className="text-[10px] text-slate-500 mt-1">Paste slide text on the left to extract materials instantly!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {Object.entries(studyData).map(([taskId, data]) => {
                                    const task = tasks.find(t => t._id === taskId);
                                    if (!task) return null;
                                    return (
                                        <TiltContainer key={taskId} className="rounded-2xl p-5" style={cardStyle}>
                                            <div className="space-y-3">
                                                <h4 className="text-sm font-bold text-[var(--text-primary)]">{task.title}</h4>
                                                <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                                                    <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-1">AI Task Summary</p>
                                                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-3">{data.summary}</p>
                                                </div>
                                                <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--border-color)]">
                                                    <span className="text-[var(--text-muted)] font-medium">📋 {data.cards?.length || 0} Flashcards</span>
                                                    <button
                                                        onClick={() => handleStartReview(taskId)}
                                                        className="px-3.5 py-1.5 rounded-lg text-white font-bold text-xs cursor-pointer hover:shadow-md transition-shadow"
                                                        style={{ background: 'var(--accent-gradient)' }}
                                                    >
                                                        Review Cards
                                                    </button>
                                                </div>
                                            </div>
                                        </TiltContainer>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
