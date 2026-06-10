export default function AuthLayout({ children, title, subtitle }) {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Grid dot background */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(rgba(148,163,184,0.05) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            />

            {/* Ambient glow blobs */}
            <div
                className="animate-blob absolute w-[520px] h-[520px] rounded-full pointer-events-none"
                style={{
                    top: '-15%', left: '-10%',
                    background: 'radial-gradient(circle, rgba(2,132,199,0.12) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                }}
            />
            <div
                className="animate-blob absolute w-[420px] h-[420px] rounded-full pointer-events-none"
                style={{
                    bottom: '-15%', right: '-5%',
                    background: 'radial-gradient(circle, rgba(13,148,136,0.1) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                    animationDelay: '3s',
                }}
            />
            <div
                className="animate-blob absolute w-[300px] h-[300px] rounded-full pointer-events-none"
                style={{
                    top: '40%', left: '55%',
                    background: 'radial-gradient(circle, rgba(2,132,199,0.08) 0%, transparent 70%)',
                    filter: 'blur(50px)',
                    animationDelay: '6s',
                }}
            />

            {/* Card */}
            <div className="w-full max-w-[430px] relative z-10 animate-fade-in-up">

                {/* Brand */}
                <div className="text-center mb-8">
                    <div
                        className="animate-float inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                        style={{
                            background: 'var(--accent-gradient)',
                            boxShadow: '0 8px 32px var(--accent-glow), 0 0 0 1px var(--border-color)',
                        }}
                    >
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2" />
                            <polyline points="12 7 12 12 15.5 13.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                        Focus<span className="text-[var(--accent-color)]">Flow</span>
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">{subtitle}</p>
                </div>

                {/* Glass Card */}
                <div
                    className="rounded-2xl p-8 border border-[var(--border-color)]"
                    style={{
                        background: 'var(--bg-secondary)',
                        boxShadow: 'var(--shadow-lg), 0 0 0 1px var(--border-color)',
                    }}
                >
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6 tracking-tight">{title}</h2>
                    {children}
                </div>

                <p className="text-center text-[var(--text-muted)] text-xs mt-5">
                    © {new Date().getFullYear()} FocusFlow — Built for deep work
                </p>
            </div>
        </div>
    );
}