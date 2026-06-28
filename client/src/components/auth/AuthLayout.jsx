import FocusFlowIcon from "../../assets/FocusFlowIcon.png";

export default function AuthLayout({ children, title, subtitle }) {
    return (
        <div className="min-h-screen flex bg-[var(--bg-primary)] transition-colors duration-200">
            
            {/* Left Panel: Premium Brand Showcase (Hidden on Mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-[#070d19] overflow-hidden items-center justify-center p-12 border-r border-[var(--border-color)]">
                {/* Background dot grid pattern */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                        backgroundImage: 'radial-gradient(rgba(56,189,248,0.15) 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                    }}
                />
                
                {/* Ambient glow blobs */}
                <div className="absolute w-[450px] h-[450px] rounded-full bg-sky-500/10 blur-[90px] -top-20 -left-20 animate-blob" />
                <div className="absolute w-[500px] h-[500px] rounded-full bg-teal-500/10 blur-[100px] -bottom-20 -right-20 animate-blob delay-3" />

                {/* Content Showcase */}
                <div className="relative z-10 text-center max-w-md animate-fade-in-up flex flex-col items-center">
                    {/* Large floating Logo with glowing blur circle */}
                    <div className="relative group mb-10 flex items-center justify-center">
                        <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-sky-500/30 to-teal-500/30 opacity-40 blur-2xl group-hover:opacity-60 transition duration-1000" />
                        <img 
                            src={FocusFlowIcon} 
                            alt="FocusFlow Brand Logo" 
                            className="relative w-64 h-64 object-contain rounded-3xl animate-float filter drop-shadow-[0_12px_28px_rgba(56,189,248,0.2)]"
                        />
                    </div>

                    <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none mb-3">
                        Plan. Focus. Achieve.
                    </h1>
                    <p className="text-slate-400 text-sm max-w-xs mb-8 leading-relaxed">
                        Intelligent schedule planning, real-time distraction blocking, and accountability pods built for students.
                    </p>

                    {/* Features list */}
                    <div className="space-y-4 text-left w-full max-w-xs">
                        {[
                            { title: "Adaptive Schedule Recovery", desc: "Automatically reschedules missed tasks around your calendar." },
                            { title: "Companion Blocker Shield", desc: "Locks down distracting domains only during focus timers." },
                            { title: "Social accountability Pods", desc: "Collaborate on goals, maintain streaks, and nudge friends." }
                        ].map((feat, idx) => (
                            <div key={idx} className="flex gap-3">
                                <div className="w-5 h-5 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                    <svg className="w-3.5 h-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-100 leading-tight">{feat.title}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{feat.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel: Content Form */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
                {/* Grid dot background for the right panel */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06]"
                    style={{
                        backgroundImage: 'radial-gradient(var(--text-primary) 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                    }}
                />

                {/* Card Container */}
                <div className="w-full max-w-[420px] relative z-10">
                    
                    {/* Small header logo for mobile screens (hidden on desktop) */}
                    <div className="lg:hidden flex flex-col items-center text-center mb-8">
                        <img 
                            src={FocusFlowIcon} 
                            alt="FocusFlow Logo" 
                            className="w-16 h-16 object-contain rounded-2xl mb-3 shadow-lg shadow-sky-500/15 animate-float"
                        />
                        <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
                            Focus<span className="text-[var(--accent-color)]">Flow</span>
                        </h1>
                        <p className="text-[var(--text-muted)] text-xs mt-1">{subtitle}</p>
                    </div>

                    {/* Glass Card */}
                    <div
                        className="rounded-2xl p-6 sm:p-8 border border-[var(--border-color)] animate-fade-in-up"
                        style={{
                            background: 'var(--bg-secondary)',
                            boxShadow: 'var(--shadow-lg), 0 0 0 1px var(--border-color)',
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-6 tracking-tight">{title}</h2>
                        {children}
                    </div>

                    <p className="text-center text-[var(--text-muted)] text-[10px] mt-6 tracking-wider uppercase opacity-60">
                        © {new Date().getFullYear()} FocusFlow — Plan. Focus. Track. Achieve.
                    </p>
                </div>
            </div>

        </div>
    );
}