export function applyAppearanceSettings(appearance) {
    if (!appearance) return;
    
    // 1. Theme (Light vs Dark vs System)
    let isDark = appearance.theme === "Dark (default)";
    
    if (appearance.theme === "System") {
        isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    if (isDark) {
        document.body.classList.add("dark-theme");
        document.body.classList.remove("light-theme");
    } else {
        document.body.classList.add("light-theme");
        document.body.classList.remove("dark-theme");
    }

    // 2. Compact Sidebar
    if (appearance.compactSidebar) {
        document.body.classList.add("compact-sidebar");
    } else {
        document.body.classList.remove("compact-sidebar");
    }

    // 3. Reduce Motion
    if (appearance.reduceMotion) {
        document.body.classList.add("reduce-motion");
    } else {
        document.body.classList.remove("reduce-motion");
    }

    // 4. Dense Layout
    if (appearance.denseLayout) {
        document.body.classList.add("dense-layout");
    } else {
        document.body.classList.remove("dense-layout");
    }
}
