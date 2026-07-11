export function applyAppearanceSettings(appearance) {
    if (!appearance) return;
    
    let isDark = appearance.theme === "Dark (default)";
    if (appearance.theme === "System") {
        isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    }
    
    document.body.classList.toggle("dark-theme", isDark);
    document.body.classList.toggle("light-theme", !isDark);
    document.body.classList.toggle("compact-sidebar", !!appearance.compactSidebar);
    document.body.classList.toggle("reduce-motion", !!appearance.reduceMotion);
    document.body.classList.toggle("dense-layout", !!appearance.denseLayout);
}
