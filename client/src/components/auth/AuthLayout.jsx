export default function AuthLayout({ children, title, subtitle }) {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold text-white">
                            FocusFlow
                        </h1>

                        <p className="text-slate-400 mt-2">
                            {subtitle}
                        </p>
                    </div>

                    <h2 className="text-xl font-semibold text-white mb-6">
                        {title}
                    </h2>

                    {children}
                </div>
            </div>
        </div>
    );
}