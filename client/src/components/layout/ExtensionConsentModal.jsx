import React, { useState } from "react";

const cardStyle = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    boxShadow: "var(--shadow-lg)",
};

export default function ExtensionConsentModal({ isOpen, onClose, downloadUrl }) {
    const [consented, setConsented] = useState(false);

    if (!isOpen) return null;

    const handleDownload = () => {
        if (!consented) return;
        // Trigger download
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = "focusflow-companion.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
            style={{ background: "rgba(15, 23, 42, 0.75)" }}
        >
            <div
                className="w-full max-w-lg p-6 rounded-2xl space-y-6 animate-fade-in-up"
                style={cardStyle}
            >
                {/* Header */}
                <div className="flex items-center gap-4 border-b border-[var(--border-color)] pb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-sky-500/10 text-sky-400 text-2xl">
                        🧩
                    </div>
                    <div>
                        <h3 className="text-slate-900 dark:text-slate-100 font-extrabold text-lg">
                            Extension Download & Privacy Disclosure
                        </h3>
                        <p className="text-[var(--text-muted)] text-xs mt-0.5 font-medium">
                            Please review the terms before installing the FocusFlow Companion
                        </p>
                    </div>
                </div>

                {/* Body Content */}
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                    <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/10 space-y-2">
                        <h4 className="font-bold text-sky-500 dark:text-sky-400 flex items-center gap-1.5">
                            📊 What Data Does the Extension Gather?
                        </h4>
                        <p>
                            To help you manage distractions and analyze your focus habits, the companion extension tracks the following telemetry while active:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-550 dark:text-slate-400">
                            <li><strong>Active Tab URLs & Domains:</strong> Monitors which website you are currently viewing to categorize it (Productive, Neutral, or Distracting).</li>
                            <li><strong>Session Duration & Status:</strong> Synchronizes Pomodoro timer intervals in real time between your open browser tabs and the main application dashboard.</li>
                            <li><strong>Interruption Signals:</strong> Logs instances when blocked domains are accessed during an active focus block to calculate schedule adherence and burnout metrics.</li>
                        </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/10 space-y-2">
                        <h4 className="font-bold text-teal-500 dark:text-teal-400 flex items-center gap-1.5">
                            🔒 Privacy Assurances
                        </h4>
                        <p>
                            We prioritize your digital privacy. Here is how your data is handled:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-550 dark:text-slate-400">
                            <li><strong>No Content Capture:</strong> Form inputs, credentials, keystrokes, and webpage contents are <em>never</em> read, monitored, or recorded.</li>
                            <li><strong>Local Focus:</strong> All data is stored locally in extension memory or securely synced strictly to your authenticated FocusFlow database.</li>
                            <li><strong>No Advertisements or Sales:</strong> Your browsing habits are never sold, monetized, or shared with third parties. There are zero external tracking scripts.</li>
                        </ul>
                    </div>
                </div>

                {/* Consent Checkbox */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] cursor-pointer hover:border-slate-350 dark:hover:border-slate-700 transition-all select-none">
                    <input
                        type="checkbox"
                        checked={consented}
                        onChange={(e) => setConsented(e.target.checked)}
                        className="accent-sky-500 h-5 w-5 rounded mt-0.5 flex-shrink-0"
                    />
                    <div className="text-xs text-[var(--text-secondary)] font-medium">
                        <p className="font-bold text-[var(--text-primary)]">I understand and consent to URL tracking</p>
                        <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
                            I agree to allow the companion extension to log active tab domains to compute focus scores and block distraction sites.
                        </p>
                    </div>
                </label>

                {/* Action Buttons */}
                <div className="flex gap-3 border-t border-[var(--border-color)] pt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs font-bold cursor-pointer transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={!consented}
                        className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold cursor-pointer transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            background: consented ? "var(--accent-gradient)" : "#94a3b8",
                            boxShadow: consented ? "0 4px 12px var(--accent-glow)" : "none",
                        }}
                    >
                        Agree & Download 📥
                    </button>
                </div>
            </div>
        </div>
    );
}
