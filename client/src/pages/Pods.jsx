import { useState, useEffect, useCallback, useRef } from "react";
import {
    getUserPods,
    getPodDetails,
    createPod,
    inviteMember,
    getPendingInvites,
    respondToInvite,
    leavePod,
    sendNudge,
    createChallenge,
    reactToActivity,
    getWeeklyReport,
    startSprint,
    joinSprint,
    getActiveSprint,
    challengeRival,
    respondToRivalChallenge,
    getRivalryStatus
} from "../services/podService";
import { searchUsers } from "../services/authService";
import { useSocket } from "../context/SocketContext";

const cardStyle = { background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' };
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
};

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

export default function Pods() {
    const socket = useSocket();
    const [pods, setPods] = useState([]);
    const [selectedPodId, setSelectedPodId] = useState("");
    const [podDetails, setPodDetails] = useState(null);
    const [activityFeed, setActivityFeed] = useState([]);
    const [pendingInvites, setPendingInvites] = useState([]);
    const [activeSprint, setActiveSprint] = useState(null);
    const [activeRivalry, setActiveRivalry] = useState(null);
    const [weeklyReport, setWeeklyReport] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("feed"); // feed | report

    const [loading, setLoading] = useState(true);
    const [podLoading, setPodLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // Modals
    const [createOpen, setCreateOpen] = useState(false);
    const [newPodName, setNewPodName] = useState("");
    const [newPodDesc, setNewPodDesc] = useState("");
    const [createLoading, setCreateLoading] = useState(false);

    const [inviteOpen, setInviteOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [invitedUserIds, setInvitedUserIds] = useState(new Set());

    const [challengeOpen, setChallengeOpen] = useState(false);
    const [challengeTitle, setChallengeTitle] = useState("");
    const [challengeTarget, setChallengeTarget] = useState("");
    const [challengeDate, setChallengeDate] = useState("");
    const [challengeLoading, setChallengeLoading] = useState(false);

    // Sprint modal
    const [sprintOpen, setSprintOpen] = useState(false);
    const [sprintDuration, setSprintDuration] = useState(30);
    const [sprintLoading, setSprintLoading] = useState(false);

    // Sprint countdown & celebration states
    const [sprintCelebration, setSprintCelebration] = useState(null);
    const [sprintTimeLeft, setSprintTimeLeft] = useState("—");
    const activeSprintRef = useRef(activeSprint);

    // Rivalry
    const [rivalOpen, setRivalOpen] = useState(false);
    const [rivalPodId, setRivalPodId] = useState("");
    const [rivalLoading, setRivalLoading] = useState(false);

    useEffect(() => {
        activeSprintRef.current = activeSprint;
    }, [activeSprint]);

    useEffect(() => {
        if (!activeSprint) {
            setSprintTimeLeft("—");
            return;
        }

        const updateTimer = () => {
            const endTime = new Date(activeSprint.endTime);
            const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
            
            if (remaining <= 0) {
                setSprintTimeLeft("00:00");
                getActiveSprint(selectedPodId).then(res => {
                    if (res.data && !res.data.sprint) {
                        setActiveSprint(null);
                        fetchPodDetails(selectedPodId);
                    }
                }).catch(e => console.error("Error ending sprint:", e));
                clearInterval(interval);
            } else {
                const m = Math.floor(remaining / 60).toString().padStart(2, "0");
                const s = (remaining % 60).toString().padStart(2, "0");
                setSprintTimeLeft(`${m}:${s}`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [activeSprint, selectedPodId, fetchPodDetails]);

    // Track reactions locally for optimistic updates
    const [localReactions, setLocalReactions] = useState({}); // { activityId: [{userId, emoji}] }

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [podsRes, invitesRes] = await Promise.all([
                getUserPods(),
                getPendingInvites()
            ]);
            
            const fetchedPods = podsRes.data.pods || [];
            setPods(fetchedPods);
            setPendingInvites(invitesRes.data.invites || []);

            if (fetchedPods.length > 0) {
                // Keep selected or pick first
                const defaultId = fetchedPods[0]._id;
                setSelectedPodId(prev => prev || defaultId);
            } else {
                setSelectedPodId("");
                setPodDetails(null);
                setActivityFeed([]);
            }
        } catch (err) {
            console.error("Error loading pod data:", err);
            showToast("Failed to load Social Pods info.", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPodDetails = useCallback(async (podId) => {
        if (!podId) return;
        setPodLoading(true);
        try {
            const res = await getPodDetails(podId);
            setPodDetails(res.data.pod);
            setActivityFeed(res.data.activityFeed || []);
            setActiveSprint(res.data.activeSprint || null);
            setActiveRivalry(res.data.activeRivalry || null);
            // Seed local reactions from feed
            const reactionMap = {};
            (res.data.activityFeed || []).forEach(a => {
                reactionMap[a._id] = a.reactions || [];
            });
            setLocalReactions(reactionMap);
        } catch (err) {
            console.error("Error loading pod details:", err);
            showToast("Failed to load pod info.", "error");
        } finally {
            setPodLoading(false);
        }
    }, []);

    // ── Socket.io real-time listeners ──────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const onPresence = ({ userId, activeSessionStart, activeTaskLabel }) => {
            setPodDetails(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    members: prev.members.map(m => {
                        const uid = m.userId?._id || m.userId;
                        if (uid?.toString() === userId?.toString()) {
                            return {
                                ...m,
                                userId: { ...m.userId, activeSessionStart, activeTaskLabel }
                            };
                        }
                        return m;
                    })
                };
            });
        };

        const onReaction = ({ activityId, reactions }) => {
            setLocalReactions(prev => ({ ...prev, [activityId]: reactions }));
        };

        const onSprintUpdate = ({ sprint, ended }) => {
            if (ended) {
                const currentSprint = activeSprintRef.current;
                const userWasParticipant = currentSprint?.participants?.some(
                    p => (p.userId?._id || p.userId)?.toString() === currentUser._id?.toString()
                );
                
                setActiveSprint(null);
                fetchPodDetails(selectedPodId); // refresh feed for sprint result
                
                if (userWasParticipant) {
                    setSprintCelebration({
                        duration: currentSprint?.duration || 30,
                        xp: 15
                    });
                } else {
                    showToast("⚡ Group sprint has ended! 15 XP awarded to participants.");
                }
            } else {
                setActiveSprint(sprint);
            }
        };

        const onHealthUpdate = ({ podId, healthScore }) => {
            if (podId?.toString() === selectedPodId) {
                setPodDetails(prev => prev ? { ...prev, healthScore } : prev);
            }
        };

        const onRivalryUpdate = (data) => {
            if (data.rivalry) {
                setActiveRivalry(data.rivalry);
            } else {
                // Partial update (XP only)
                setActiveRivalry(prev => prev ? { ...prev, ...data } : prev);
            }
        };

        socket.on("presence:update", onPresence);
        socket.on("session:reaction", onReaction);
        socket.on("sprint:update", onSprintUpdate);
        socket.on("pod:health:update", onHealthUpdate);
        socket.on("rivalry:update", onRivalryUpdate);

        return () => {
            socket.off("presence:update", onPresence);
            socket.off("session:reaction", onReaction);
            socket.off("sprint:update", onSprintUpdate);
            socket.off("pod:health:update", onHealthUpdate);
            socket.off("rivalry:update", onRivalryUpdate);
        };
    }, [socket, selectedPodId, fetchPodDetails]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        if (selectedPodId) {
            fetchPodDetails(selectedPodId);
        }
    }, [selectedPodId, fetchPodDetails]);

    // Handle invite accept/decline
    const handleInviteResponse = async (inviteId, accept) => {
        try {
            await respondToInvite(inviteId, accept);
            showToast(accept ? "Accepted invitation! Welcome to the Pod." : "Declined invitation.");
            fetchInitialData();
        } catch (err) {
            console.error("Invite response error:", err);
            showToast(err.response?.data?.message || "Failed to respond to invite.", "error");
        }
    };

    // Create Pod
    const handleCreatePod = async (e) => {
        e.preventDefault();
        if (!newPodName.trim()) return;
        setCreateLoading(true);
        try {
            const res = await createPod({ name: newPodName, description: newPodDesc });
            showToast(`Pod "${newPodName}" created successfully!`);
            setNewPodName("");
            setNewPodDesc("");
            setCreateOpen(false);
            
            // Auto-select the newly created pod
            setSelectedPodId(res.data.pod._id);
            fetchInitialData();
        } catch (err) {
            console.error("Create pod error:", err);
            showToast("Failed to create pod.", "error");
        } finally {
            setCreateLoading(false);
        }
    };

    // Search users for invite
    const handleUserSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const res = await searchUsers(searchQuery);
            setSearchResults(res.data.users || []);
        } catch (err) {
            console.error("Search error:", err);
            showToast("Failed to search users.", "error");
        } finally {
            setSearching(false);
        }
    };

    // Send invitation
    const handleSendInvite = async (toUserId) => {
        try {
            await inviteMember(selectedPodId, toUserId);
            showToast("Invitation sent!");
            setInvitedUserIds(prev => {
                const updated = new Set(prev);
                updated.add(toUserId);
                return updated;
            });
        } catch (err) {
            console.error("Invite member error:", err);
            showToast(err.response?.data?.message || "Failed to invite member.", "error");
        }
    };

    // Leave pod
    const handleLeavePod = async () => {
        if (!window.confirm("Are you sure you want to leave this pod?")) return;
        try {
            await leavePod(selectedPodId);
            showToast("You have left the pod.");
            setSelectedPodId("");
            fetchInitialData();
        } catch (err) {
            console.error("Leave pod error:", err);
            showToast("Failed to leave pod.", "error");
        }
    };

    // Send nudge
    const handleSendNudge = async (toUserId, type) => {
        try {
            await sendNudge(selectedPodId, toUserId, type);
            showToast(`Nudge sent!`);
        } catch (err) {
            console.error("Send nudge error:", err);
            showToast("Failed to send nudge.", "error");
        }
    };

    // Create Challenge
    const handleCreateChallenge = async (e) => {
        e.preventDefault();
        if (!challengeTitle.trim() || !challengeTarget || !challengeDate) return;
        setChallengeLoading(true);
        try {
            await createChallenge(selectedPodId, {
                title: challengeTitle,
                targetXP: Number(challengeTarget),
                endDate: challengeDate
            });
            showToast(`Challenge "${challengeTitle}" started!`);
            setChallengeTitle("");
            setChallengeTarget("");
            setChallengeDate("");
            setChallengeOpen(false);
            fetchPodDetails(selectedPodId);
        } catch (err) {
            console.error("Create challenge error:", err);
            showToast("Failed to create challenge.", "error");
        } finally {
            setChallengeLoading(false);
        }
    };

    // Calculate challenge percentages
    const getChallengeProgressPercent = (challenge) => {
        let total = 0;
        const progressObj = challenge.progress || {};
        Object.values(progressObj).forEach(val => { total += val; });
        return Math.min(Math.round((total / challenge.targetXP) * 100), 100);
    };

    const getChallengeTotalXP = (challenge) => {
        let total = 0;
        const progressObj = challenge.progress || {};
        Object.values(progressObj).forEach(val => { total += val; });
        return total;
    };

    // ── Session Reactions ──────────────────────────────────────────────────────
    const handleReact = async (activityId, emoji) => {
        const current = (localReactions[activityId] || []);
        const myReaction = current.find(r => r.userId?.toString() === currentUser._id?.toString());
        const isToggle = myReaction?.emoji === emoji;

        // Optimistic update
        setLocalReactions(prev => {
            const filtered = (prev[activityId] || []).filter(r => r.userId?.toString() !== currentUser._id?.toString());
            if (!isToggle) {
                filtered.push({ userId: currentUser._id, emoji });
            }
            return { ...prev, [activityId]: filtered };
        });

        try {
            await reactToActivity(selectedPodId, activityId, emoji, isToggle);
        } catch (err) {
            // Revert on error
            setLocalReactions(prev => ({ ...prev, [activityId]: current }));
            showToast("Failed to react.", "error");
        }
    };

    // ── Weekly Report ──────────────────────────────────────────────────────────
    const handleLoadReport = async () => {
        if (!selectedPodId) return;
        setReportLoading(true);
        try {
            const res = await getWeeklyReport(selectedPodId);
            setWeeklyReport(res.data.report);
        } catch (err) {
            showToast("Failed to load weekly report.", "error");
        } finally {
            setReportLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "report" && selectedPodId && !weeklyReport) {
            handleLoadReport();
        }
    }, [activeTab, selectedPodId]);

    // ── Group Sprint Rooms ─────────────────────────────────────────────────────
    const handleStartSprint = async (e) => {
        e.preventDefault();
        setSprintLoading(true);
        try {
            const res = await startSprint(selectedPodId, sprintDuration);
            setActiveSprint(res.data.sprint);
            setSprintOpen(false);
            showToast(`⚡ ${sprintDuration}-min sprint started! Members notified.`);
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to start sprint.", "error");
        } finally {
            setSprintLoading(false);
        }
    };

    const handleJoinSprint = async () => {
        if (!activeSprint) return;
        try {
            const res = await joinSprint(selectedPodId, activeSprint._id);
            setActiveSprint(res.data.sprint);
            showToast("You joined the sprint! 💪");
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to join sprint.", "error");
        }
    };

    // ── Rival Pods ─────────────────────────────────────────────────────────────
    const handleChallengeRival = async (e) => {
        e.preventDefault();
        if (!rivalPodId.trim()) return;
        setRivalLoading(true);
        try {
            await challengeRival(selectedPodId, rivalPodId.trim());
            setRivalOpen(false);
            setRivalPodId("");
            showToast("⚔️ Challenge sent! Waiting for their response.");
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to send challenge.", "error");
        } finally {
            setRivalLoading(false);
        }
    };

    const handleRespondRivalry = async (rivalryId, accept) => {
        try {
            await respondToRivalChallenge(rivalryId, accept);
            fetchPodDetails(selectedPodId);
            showToast(accept ? "⚔️ Rivalry accepted! The battle begins!" : "Challenge declined.");
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to respond.", "error");
        }
    };

    // ── Helpers ────────────────────────────────────────────────────────────────
    const getHealthBarColor = (score) => {
        if (score >= 80) return { color: '#22c55e', glow: 'rgba(34,197,94,0.3)', label: 'Thriving 🟢' };
        if (score >= 40) return { color: '#f59e0b', glow: 'rgba(245,158,11,0.3)', label: 'Slowing Down 🟡' };
        return { color: '#ef4444', glow: 'rgba(239,68,68,0.4)', label: 'Critical 🔴' };
    };

    const getSprintTimeLeft = (sprint) => {
        if (!sprint) return "—";
        const endTime = new Date(sprint.endTime);
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        const m = Math.floor(remaining / 60).toString().padStart(2, "0");
        const s = (remaining % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    const isInSprint = activeSprint?.participants?.some(
        p => (p.userId?._id || p.userId)?.toString() === currentUser._id?.toString()
    );

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                        Social Pods
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Connect in small group accountability circles to study and grow together.
                    </p>
                </div>
                <button
                    onClick={() => setCreateOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 shadow-md cursor-pointer self-start sm:self-center"
                    style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 16px var(--accent-glow)' }}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Create a Pod
                </button>
            </div>

            {/* Pending Invitations Banner */}
            {pendingInvites.length > 0 && (
                <div className="bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/40 rounded-2xl p-4 space-y-3">
                    <h3 className="text-sky-900 dark:text-sky-300 font-bold text-sm flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        Pending Pod Invitations ({pendingInvites.length})
                    </h3>
                    <div className="divide-y divide-sky-100 dark:divide-sky-900/30">
                        {pendingInvites.map(invite => (
                            <div key={invite._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-200 text-xs font-bold overflow-hidden">
                                        {invite.fromUserId?.profilePicture ? (
                                            <img src={invite.fromUserId.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            invite.fromUserId?.name?.slice(0, 2).toUpperCase() || "U"
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                            {invite.fromUserId?.name} <span className="font-normal text-slate-500 text-xs">invited you to join</span> {invite.podId?.name}
                                        </p>
                                        {invite.podId?.description && (
                                            <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5">{invite.podId.description}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 self-end sm:self-center">
                                    <button
                                        onClick={() => handleInviteResponse(invite._id, false)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-300 transition cursor-pointer"
                                    >
                                        Decline
                                    </button>
                                    <button
                                        onClick={() => handleInviteResponse(invite._id, true)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 transition cursor-pointer shadow-sm"
                                    >
                                        Accept
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <svg className="animate-spin-slow w-8 h-8 text-sky-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading Social Pods...</p>
                </div>
            ) : pods.length === 0 ? (
                /* Empty state dashboard */
                <div className="rounded-2xl p-8 text-center flex flex-col items-center justify-center max-w-xl mx-auto space-y-5 py-12" style={cardStyle}>
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-sky-100 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/30">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Join or Create a Social Pod</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                            Study pods are small accountability networks for 3–4 friends. You can keep track of streaks, participate in joint focus challenges, send motivational nudges, and level up with collective XP.
                        </p>
                    </div>
                    <button
                        onClick={() => setCreateOpen(true)}
                        className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 shadow-md cursor-pointer"
                        style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 16px var(--accent-glow)' }}
                    >
                        Form a Study Pod
                    </button>
                </div>
            ) : (
                /* Primary Dashboard Grid */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Feed Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Selector Tab Header */}
                        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                            {pods.map(pod => (
                                <button
                                    key={pod._id}
                                    onClick={() => setSelectedPodId(pod._id)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0 cursor-pointer border ${
                                        selectedPodId === pod._id
                                            ? 'bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/40'
                                            : 'bg-[var(--bg-secondary)] text-slate-500 border-[var(--border-color)] hover:text-slate-700 dark:hover:text-slate-355'
                                    }`}
                                >
                                    {pod.name}
                                </button>
                            ))}
                        </div>

                        {podLoading && !podDetails ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3" style={cardStyle}>
                                <svg className="animate-spin-slow w-6 h-6 text-sky-500" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <p className="text-slate-500 dark:text-slate-400 text-xs">Loading feed...</p>
                            </div>
                        ) : podDetails ? (
                            <div className="space-y-6">
                                {/* Pod Meta Header */}
                                <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">{podDetails.name}</h2>
                                            {podDetails.description && (
                                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{podDetails.description}</p>
                                            )}
                                            <p className="text-[10px] text-slate-400 font-mono mt-1.5 select-all cursor-pointer inline-flex items-center gap-1 bg-[var(--bg-primary)] px-2 py-0.5 rounded border border-[var(--border-color)] hover:border-sky-400 transition" title="Click to copy Pod ID" onClick={() => {
                                                navigator.clipboard.writeText(podDetails._id);
                                                showToast("Pod ID copied to clipboard!");
                                            }}>
                                                ID: {podDetails._id} 📋
                                            </p>
                                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-2.5">
                                                Leader: <span className="text-slate-500 font-bold">{podDetails.leaderId?.name || "Unknown"}</span>
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleLeavePod}
                                            className="p-2 rounded-lg text-slate-400 hover:text-rose-500 transition border border-[var(--border-color)] hover:border-rose-500/25 bg-[var(--bg-primary)] cursor-pointer"
                                            title="Leave Pod"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                                        </button>
                                    </div>

                                    {/* Pod Health Bar */}
                                    {(() => {
                                        const health = podDetails.healthScore ?? 100;
                                        const hc = getHealthBarColor(health);
                                        return (
                                            <div className="pt-3 border-t border-[var(--border-color)] space-y-2">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                                        <span>❤️</span> Pod Health
                                                    </span>
                                                    <span className="font-bold" style={{ color: hc.color }}>{hc.label} · {health}%</span>
                                                </div>
                                                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                                                    <div
                                                        className="h-full rounded-full transition-all duration-700"
                                                        style={{ width: `${health}%`, background: hc.color, boxShadow: `0 0 8px ${hc.glow}` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                                                    <span>🔥 Streak: {podDetails.streak} days</span>
                                                    <span>👥 {podDetails.members?.length || 0} members</span>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Action Buttons Row */}
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <button
                                            onClick={() => setInviteOpen(true)}
                                            className="flex-1 min-w-[120px] py-2 rounded-xl text-xs font-bold border border-[var(--border-color)] text-slate-600 dark:text-slate-300 hover:border-sky-400 hover:text-sky-500 transition cursor-pointer bg-[var(--bg-primary)]"
                                        >
                                            ✉️ Invite
                                        </button>
                                        <button
                                            onClick={() => setSprintOpen(true)}
                                            className="flex-1 min-w-[120px] py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                                            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0d9488)', color: '#fff' }}
                                        >
                                            ⚡ Start Sprint
                                        </button>
                                        {podDetails.leaderId?._id?.toString() === currentUser._id?.toString() && (
                                            <button
                                                onClick={() => setRivalOpen(true)}
                                                className="flex-1 min-w-[120px] py-2 rounded-xl text-xs font-bold border border-orange-400/40 text-orange-500 hover:bg-orange-500/10 transition cursor-pointer"
                                            >
                                                ⚔️ Challenge Rival
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Active Sprint Room Banner */}
                                {activeSprint && (
                                    <div className="rounded-2xl p-5 space-y-4 border" style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(13,148,136,0.08))', borderColor: 'rgba(14,165,233,0.3)' }}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">⚡</span>
                                                <div>
                                                    <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{activeSprint.duration}-min Group Sprint</p>
                                                    <p className="text-xs text-slate-400">Started by {activeSprint.startedBy?.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-mono text-2xl font-extrabold" style={{ color: '#0ea5e9' }}>{sprintTimeLeft}</p>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">time left</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {activeSprint.participants?.map(p => (
                                                <div key={p.userId?._id || p.userId} className="relative" title={p.userId?.name || "Member"}>
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden" style={{ background: 'var(--accent-glow)', color: 'var(--accent-color)', border: '2px solid var(--accent-color)' }}>
                                                        {p.userId?.profilePicture ? <img src={p.userId.profilePicture} alt="" className="w-full h-full object-cover" /> : (p.userId?.name?.slice(0, 2).toUpperCase() || '?')}
                                                    </div>
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[var(--bg-secondary)]"></div>
                                                </div>
                                            ))}
                                            {!isInSprint && (
                                                <button
                                                    onClick={handleJoinSprint}
                                                    className="ml-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer"
                                                    style={{ background: '#0ea5e9' }}
                                                >
                                                    Join Sprint
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Rivalry Banner */}
                                {activeRivalry && (() => {
                                    const isChallenger = activeRivalry.challengerPodId?._id === selectedPodId || activeRivalry.challengerPodId === selectedPodId;
                                    const myXP = isChallenger ? activeRivalry.challengerXP : activeRivalry.challengedXP;
                                    const theirXP = isChallenger ? activeRivalry.challengedXP : activeRivalry.challengerXP;
                                    const rivalName = isChallenger ? activeRivalry.challengedPodId?.name : activeRivalry.challengerPodId?.name;
                                    const totalXP = myXP + theirXP || 1;
                                    const myPct = Math.round((myXP / totalXP) * 100);
                                    const daysLeft = activeRivalry.endDate ? Math.max(0, Math.ceil((new Date(activeRivalry.endDate) - Date.now()) / 86400000)) : 7;
                                    return (
                                        <div className="rounded-2xl p-5 space-y-3 border" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(239,68,68,0.06))', borderColor: 'rgba(249,115,22,0.3)' }}>
                                            <div className="flex items-center justify-between">
                                                <p className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">⚔️ Rival Battle <span className="text-orange-400">LIVE</span></p>
                                                <p className="text-xs text-slate-400">{daysLeft} days left</p>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm font-bold">
                                                <span className="text-sky-500">{podDetails.name}</span>
                                                <span className="text-slate-400 text-xs">VS</span>
                                                <span className="text-orange-500">{rivalName}</span>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs text-slate-400">
                                                    <span>{myXP} XP</span><span>{theirXP} XP</span>
                                                </div>
                                                <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(239,68,68,0.2)' }}>
                                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${myPct}%`, background: 'linear-gradient(90deg, #0ea5e9, #0d9488)' }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Active Challenges */}
                                <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-sm text-slate-850 dark:text-slate-200">Group Quests</h3>
                                        <button
                                            onClick={() => setChallengeOpen(true)}
                                            className="text-xs font-bold text-sky-500 hover:text-sky-400 transition cursor-pointer flex items-center gap-1"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                            Start Challenge
                                        </button>
                                    </div>

                                    {podDetails.challenges?.filter(c => c.status === "active").length === 0 ? (
                                        <div className="text-center py-4 border border-dashed border-[var(--border-color)] rounded-xl">
                                            <p className="text-xs text-slate-400">No active group challenges. Team up now!</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {podDetails.challenges?.filter(c => c.status === "active").map(challenge => (
                                                <div key={challenge._id} className="space-y-2">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-700 dark:text-slate-300">{challenge.title}</span>
                                                        <span className="text-slate-400">Ends {new Date(challenge.endDate).toLocaleDateString()}</span>
                                                    </div>
                                                    
                                                    {/* Progress bar */}
                                                    <div className="w-full bg-[var(--bg-primary)] h-2 rounded-full overflow-hidden border border-[var(--border-color)]">
                                                        <div
                                                            className="bg-gradient-to-r from-sky-400 to-teal-400 h-full rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${getChallengeProgressPercent(challenge)}%`,
                                                                background: 'linear-gradient(90deg, var(--accent-color) 0%, #0d9488 100%)'
                                                            }}
                                                        />
                                                    </div>
                                                    
                                                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold uppercase">
                                                        <span>Progress</span>
                                                        <span>{getChallengeTotalXP(challenge)} / {challenge.targetXP} XP</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Social Feed / Weekly Report Tabs */}
                                <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
                                    <div className="flex border-b border-[var(--border-color)] pb-1">
                                        <button
                                            onClick={() => setActiveTab("feed")}
                                            className={`pb-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                                                activeTab === "feed"
                                                    ? "border-sky-505 text-sky-500 border-sky-500 font-extrabold"
                                                    : "border-transparent text-slate-400 hover:text-slate-200"
                                            }`}
                                        >
                                            Social Feed
                                        </button>
                                        <button
                                            onClick={() => {
                                                setActiveTab("report");
                                                handleLoadReport();
                                            }}
                                            className={`pb-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                                                activeTab === "report"
                                                    ? "border-sky-505 text-sky-500 border-sky-500 font-extrabold"
                                                    : "border-transparent text-slate-400 hover:text-slate-200"
                                            }`}
                                        >
                                            Weekly Report Card
                                        </button>
                                    </div>
                                    
                                    {activeTab === "feed" ? (
                                        activityFeed.length === 0 ? (
                                            <p className="text-xs text-slate-400 text-center py-6">No recent pod activities yet. Hit those books!</p>
                                        ) : (
                                            <div className="space-y-4 relative pl-4 border-l border-[var(--border-color)]">
                                                {activityFeed.map((activity) => {
                                                    const iconMap = {
                                                        join: '👋',
                                                        completion: '🎉',
                                                        miss: '⚠️',
                                                        recovery: '💪',
                                                        challenge: '🚀',
                                                        sprint: '⚡',
                                                        reaction: '❤️'
                                                    };
                                                    const bulletColorMap = {
                                                        join: 'bg-emerald-500/10 border-emerald-500 text-emerald-500',
                                                        completion: 'bg-sky-500/10 border-sky-500 text-sky-500',
                                                        miss: 'bg-rose-500/10 border-rose-500 text-rose-500',
                                                        recovery: 'bg-teal-500/10 border-teal-500 text-teal-500',
                                                        challenge: 'bg-purple-500/10 border-purple-500 text-purple-500',
                                                        sprint: 'bg-yellow-500/10 border-yellow-500 text-yellow-600',
                                                        reaction: 'bg-pink-500/10 border-pink-500 text-pink-500'
                                                    };
                                                    const itemColor = bulletColorMap[activity.type] || 'bg-slate-500/10 border-slate-500 text-slate-500';
                                                    const reactions = localReactions[activity._id] || [];
                                                    const EMOJIS = ['🔥', '👏', '💯', '🚀'];

                                                    return (
                                                        <div key={activity._id} className="relative group space-y-1.5">
                                                            {/* Timeline bullet */}
                                                            <div
                                                                className={`absolute -left-[25px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] ${itemColor}`}
                                                                style={{ transform: 'translateX(-50%)' }}
                                                            >
                                                                {iconMap[activity.type] || '•'}
                                                            </div>
                                                            
                                                            <div className="flex justify-between items-start gap-4">
                                                                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                                                    {activity.message}
                                                                </p>
                                                                <span className="text-[9px] text-slate-400 flex-shrink-0">
                                                                    {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>

                                                            {/* Emoji Reactions — only on completion type */}
                                                            {activity.type === 'completion' && (
                                                                <div className="flex items-center gap-1.5 mt-1">
                                                                    {EMOJIS.map(emoji => {
                                                                        const myReaction = reactions.find(r => r.userId?.toString() === currentUser._id?.toString());
                                                                        const isActive = myReaction?.emoji === emoji;
                                                                        const count = reactions.filter(r => r.emoji === emoji).length;
                                                                        return (
                                                                            <button
                                                                                key={emoji}
                                                                                onClick={() => handleReact(activity._id, emoji)}
                                                                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-xs transition cursor-pointer"
                                                                                style={{
                                                                                    background: isActive ? 'var(--accent-glow)' : 'var(--bg-primary)',
                                                                                    border: `1px solid ${isActive ? 'var(--accent-color)' : 'var(--border-color)'}`,
                                                                                    opacity: activity.userId?._id?.toString() === currentUser._id?.toString() ? 0.4 : 1
                                                                                }}
                                                                                disabled={activity.userId?._id?.toString() === currentUser._id?.toString()}
                                                                                title={activity.userId?._id?.toString() === currentUser._id?.toString() ? "Can't react to your own session" : `React with ${emoji}`}
                                                                            >
                                                                                <span>{emoji}</span>
                                                                                {count > 0 && <span className="text-[9px] font-bold text-slate-500">{count}</span>}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )
                                    ) : (
                                        /* Weekly Report Card UI */
                                        reportLoading ? (
                                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                                <svg className="animate-spin-slow w-6 h-6 text-sky-500" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                <p className="text-slate-400 text-xs">Generating report...</p>
                                            </div>
                                        ) : weeklyReport ? (
                                            <div className="space-y-5">
                                                {/* Header Stats */}
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/10 text-center">
                                                        <p className="text-[10px] text-slate-450 uppercase font-semibold">Weekly Pod XP</p>
                                                        <p className="text-lg font-extrabold text-sky-500">{weeklyReport.totalPodXP} XP</p>
                                                    </div>
                                                    <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 text-center">
                                                        <p className="text-[10px] text-slate-450 uppercase font-semibold">Pod Streak</p>
                                                        <p className="text-lg font-extrabold text-orange-500">{weeklyReport.podStreak} days</p>
                                                    </div>
                                                    <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/10 text-center">
                                                        <p className="text-[10px] text-slate-450 uppercase font-semibold">Health Score</p>
                                                        <p className="text-lg font-extrabold text-green-500">{weeklyReport.healthScore}%</p>
                                                    </div>
                                                </div>

                                                {/* MVP Spotlight */}
                                                {weeklyReport.mvp?.user && (
                                                    <div className="p-4 rounded-xl border border-yellow-500/25 bg-gradient-to-r from-yellow-500/5 to-amber-500/5 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-2xl">🏆</span>
                                                            <div>
                                                                <p className="text-[10px] text-yellow-600 dark:text-yellow-400 font-bold uppercase tracking-wider">Weekly MVP Spotlight</p>
                                                                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{weeklyReport.mvp.user.name}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-slate-400">Contribution</p>
                                                            <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">+{weeklyReport.mvp.xp} XP</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Member Breakdown Table */}
                                                <div className="space-y-2">
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Member Contributions</p>
                                                    <div className="space-y-2">
                                                        {weeklyReport.members?.map(m => {
                                                            const u = m.user || {};
                                                            return (
                                                                <div key={u._id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 text-slate-700 text-xs font-bold overflow-hidden">
                                                                            {u.profilePicture ? <img src={u.profilePicture} alt="" className="w-full h-full object-cover" /> : (u.name?.slice(0, 2).toUpperCase() || "?")}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{u.name}</p>
                                                                            <p className="text-[10px] text-slate-400">Consistency: {m.daysActive}/7 days active</p>
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-xs font-extrabold text-emerald-500">+{m.xpEarned} XP</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 text-center py-6">Failed to load weekly report.</p>
                                        )
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* Sidebar Leaderboard Column */}
                    <div className="space-y-6">
                        {/* Leaderboard Panel */}
                        {podDetails && (
                            <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-sm text-slate-850 dark:text-slate-200">Pod Leaderboard</h3>
                                    <span className="text-[10px] bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded font-bold uppercase">Weekly</span>
                                </div>

                                <div className="space-y-3">
                                    {podDetails.members?.slice()
                                        .sort((a, b) => (b.userId?.xp || 0) - (a.userId?.xp || 0))
                                        .map((member, index) => {
                                            const u = member.userId || {};
                                            const isMe = u._id === currentUser.id;
                                            
                                            return (
                                                <div
                                                    key={member._id}
                                                    className={`flex items-center justify-between p-2.5 rounded-xl border ${
                                                        isMe
                                                            ? 'bg-sky-50/40 dark:bg-sky-950/10 border-sky-200/50 dark:border-sky-850/30'
                                                            : 'bg-transparent border-transparent'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {/* Rank */}
                                                        <span className="text-xs font-extrabold text-slate-400 w-4">
                                                            #{index + 1}
                                                        </span>
                                                        
                                                        {/* Avatar */}
                                                        <div className="relative">
                                                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold overflow-hidden flex-shrink-0">
                                                                {u.profilePicture ? (
                                                                    <img src={u.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    u.name?.slice(0, 2).toUpperCase() || "U"
                                                                )}
                                                            </div>
                                                            {u.activeSessionStart && (
                                                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-[var(--bg-secondary)]" title="Studying now!" />
                                                            )}
                                                        </div>

                                                        {/* Details */}
                                                        <div className="min-w-0">
                                                            <p className={`text-xs font-bold truncate ${isMe ? 'text-sky-600 dark:text-sky-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                                {u.name} {isMe && "(You)"}
                                                            </p>
                                                            {u.activeSessionStart ? (
                                                                <p className="text-[10px] text-green-500 font-semibold animate-pulse mt-0.5">
                                                                    ✍️ studying {u.activeTaskLabel ? `"${u.activeTaskLabel}"` : "now"}
                                                                </p>
                                                            ) : (
                                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                                    🔥 {u.streak || 0} day streak
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* XP details & nudge actions */}
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                                                            {u.xp || 0} XP
                                                        </span>

                                                        {/* Nudge popup triggers (only for others) */}
                                                        {!isMe && (
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => handleSendNudge(u._id, "clap")}
                                                                    className="p-1 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-sky-400 text-[10px] cursor-pointer"
                                                                    title="Send Kudos 👏"
                                                                >
                                                                    👏
                                                                </button>
                                                                <button
                                                                    onClick={() => handleSendNudge(u._id, "encourage")}
                                                                    className="p-1 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-teal-400 text-[10px] cursor-pointer"
                                                                    title="Send Encourage 💪"
                                                                >
                                                                    💪
                                                                </button>
                                                                <button
                                                                    onClick={() => handleSendNudge(u._id, "poke")}
                                                                    className="p-1 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-orange-400 text-[10px] cursor-pointer"
                                                                    title="Send Poke 👉"
                                                                >
                                                                    👉
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>

                                <button
                                    onClick={() => setInviteOpen(true)}
                                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sky-500 border border-sky-500/20 hover:bg-sky-500/5 transition text-xs font-semibold mt-2 cursor-pointer"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
                                    Invite Friends
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CREATE POD MODAL */}
            {createOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-md p-6 rounded-2xl animate-fade-in-up" style={cardStyle}>
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">Create a Pod</h3>
                            <button
                                onClick={() => setCreateOpen(false)}
                                className="text-slate-400 hover:text-slate-200 cursor-pointer"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreatePod} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">Pod Name *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Study Champs, Code Warriors"
                                    value={newPodName}
                                    onChange={(e) => setNewPodName(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">Description</label>
                                <textarea
                                    placeholder="What is the focus of this pod? (optional)"
                                    rows={3}
                                    value={newPodDesc}
                                    onChange={(e) => setNewPodDesc(e.target.value)}
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCreateOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-[var(--border-color)] bg-[var(--bg-primary)] text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading || !newPodName.trim()}
                                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold cursor-pointer transition"
                                    style={{
                                        background: 'var(--accent-gradient)',
                                        opacity: createLoading || !newPodName.trim() ? 0.6 : 1,
                                    }}
                                >
                                    {createLoading ? "Creating..." : "Create"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* INVITE FRIENDS MODAL */}
            {inviteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-md p-6 rounded-2xl animate-fade-in-up" style={cardStyle}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">Invite Friends to Pod</h3>
                            <button
                                onClick={() => setInviteOpen(false)}
                                className="text-slate-400 hover:text-slate-200 cursor-pointer"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleUserSearch} className="flex gap-2 mb-4">
                            <input
                                required
                                type="text"
                                placeholder="Search by username or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ ...inputStyle, flex: 1 }}
                            />
                            <button
                                type="submit"
                                className="px-4 rounded-xl text-white text-xs font-semibold cursor-pointer"
                                style={{ background: 'var(--accent-gradient)' }}
                            >
                                Search
                            </button>
                        </form>

                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                            {searching ? (
                                <p className="text-xs text-slate-500 text-center py-4">Searching users...</p>
                            ) : searchResults.length === 0 ? (
                                searchQuery && <p className="text-xs text-slate-500 text-center py-4">No users found.</p>
                            ) : (
                                searchResults.map(user => {
                                    const alreadyMember = podDetails?.members?.some(m => m.userId?._id === user._id);
                                    const invited = invitedUserIds.has(user._id);
                                    
                                    return (
                                        <div key={user._id} className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 text-slate-700 text-xs font-bold overflow-hidden">
                                                    {user.profilePicture ? (
                                                        <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        user.name?.slice(0, 2).toUpperCase() || "U"
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                     <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                                         {user.name} {user.username && <span className="text-[10px] text-slate-500 font-normal">@{user.username}</span>}
                                                     </p>
                                                     <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                                                 </div>
                                            </div>
                                            
                                            {alreadyMember ? (
                                                <span className="text-[10px] text-slate-400 font-semibold uppercase pr-2">Member</span>
                                            ) : invited ? (
                                                <span className="text-[10px] text-sky-500 font-semibold uppercase pr-2">Invited</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleSendInvite(user._id)}
                                                    className="px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-bold cursor-pointer"
                                                >
                                                    Invite
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* START CHALLENGE MODAL */}
            {challengeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-md p-6 rounded-2xl animate-fade-in-up" style={cardStyle}>
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">Start Group Quest</h3>
                            <button
                                onClick={() => setChallengeOpen(false)}
                                className="text-slate-400 hover:text-slate-200 cursor-pointer"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateChallenge} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">Challenge Title *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. DSA Marathon, Study Sprint"
                                    value={challengeTitle}
                                    onChange={(e) => setChallengeTitle(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">Collective Target (XP) *</label>
                                    <input
                                        required
                                        type="number"
                                        min="10"
                                        placeholder="e.g. 200"
                                        value={challengeTarget}
                                        onChange={(e) => setChallengeTarget(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">End Date *</label>
                                    <input
                                        required
                                        type="date"
                                        value={challengeDate}
                                        onChange={(e) => setChallengeDate(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setChallengeOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-[var(--border-color)] bg-[var(--bg-primary)] text-slate-500 hover:text-slate-700 dark:hover:text-slate-355 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={challengeLoading || !challengeTitle.trim() || !challengeTarget || !challengeDate}
                                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold cursor-pointer transition"
                                    style={{
                                        background: 'var(--accent-gradient)',
                                        opacity: challengeLoading || !challengeTitle.trim() || !challengeTarget || !challengeDate ? 0.6 : 1,
                                    }}
                                >
                                    {challengeLoading ? "Starting..." : "Start Quest"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* GROUP SPRINT MODAL */}
            {sprintOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-md p-6 rounded-2xl animate-fade-in-up" style={cardStyle}>
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">Start Group Sprint</h3>
                            <button
                                onClick={() => setSprintOpen(false)}
                                className="text-slate-400 hover:text-slate-200 cursor-pointer"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <form onSubmit={handleStartSprint} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">Duration (Minutes) *</label>
                                <select
                                    value={sprintDuration}
                                    onChange={(e) => setSprintDuration(Number(e.target.value))}
                                    style={inputStyle}
                                >
                                    <option value={30}>30 Minutes</option>
                                    <option value={45}>45 Minutes</option>
                                    <option value={60}>60 Minutes</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSprintOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-[var(--border-color)] bg-[var(--bg-primary)] text-slate-500 hover:text-slate-700 dark:hover:text-slate-355 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sprintLoading}
                                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold cursor-pointer transition"
                                    style={{
                                        background: 'linear-gradient(135deg, #0ea5e9, #0d9488)',
                                        opacity: sprintLoading ? 0.6 : 1,
                                    }}
                                >
                                    {sprintLoading ? "Starting..." : "Start Sprint ⚡"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CHALLENGE RIVAL MODAL */}
            {rivalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-md p-6 rounded-2xl animate-fade-in-up" style={cardStyle}>
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">Challenge a Rival Pod</h3>
                            <button
                                onClick={() => setRivalOpen(false)}
                                className="text-slate-400 hover:text-slate-200 cursor-pointer"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <form onSubmit={handleChallengeRival} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">Rival Pod ID *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Enter Pod ID of the rival pod..."
                                    value={rivalPodId}
                                    onChange={(e) => setRivalPodId(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setRivalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-[var(--border-color)] bg-[var(--bg-primary)] text-slate-500 hover:text-slate-700 dark:hover:text-slate-355 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={rivalLoading || !rivalPodId.trim()}
                                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold cursor-pointer transition"
                                    style={{
                                        background: 'linear-gradient(135deg, #f97316, #ef4444)',
                                        opacity: rivalLoading || !rivalPodId.trim() ? 0.6 : 1,
                                    }}
                                >
                                    {rivalLoading ? "Sending Challenge..." : "Send Challenge ⚔️"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sprint Completion Celebration Modal */}
            {sprintCelebration && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                    <div 
                        className="w-full max-w-sm p-8 rounded-3xl border border-yellow-500/30 bg-[var(--bg-secondary)] text-center relative overflow-hidden"
                        style={{
                            boxShadow: '0 20px 50px rgba(234, 179, 8, 0.15)',
                        }}
                    >
                        {/* Confetti & Glow backgrounds */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/5 to-teal-500/5 opacity-50 pointer-events-none" />
                        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-yellow-500/10 blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col items-center">
                            <span className="text-5xl mb-4 animate-bounce">🏆</span>
                            <h3 className="text-xl font-extrabold text-[var(--text-primary)]">Sprint Completed!</h3>
                            <p className="text-xs text-[var(--text-muted)] mt-2">
                                Incredible effort! You completed the {sprintCelebration.duration}-minute group study block.
                            </p>
                            
                            {/* Reward badge card */}
                            <div className="my-6 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 w-full animate-pulse-slow">
                                <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest block">Sprint Reward</span>
                                <span className="text-2xl font-black text-yellow-500 mt-1 block">+{sprintCelebration.xp} XP</span>
                            </div>
                            
                            <button
                                onClick={() => setSprintCelebration(null)}
                                className="w-full py-2.5 rounded-xl text-white text-xs font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer"
                                style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 12px var(--accent-glow)' }}
                            >
                                Awesome, Keep it up!
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Toast toast={toast} />
        </div>
    );
}
