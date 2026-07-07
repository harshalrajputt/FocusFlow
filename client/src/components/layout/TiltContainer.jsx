import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { isMobileDevice } from "../../utils/deviceUtils";

/**
 * TiltContainer
 * -------------
 * Desktop : Full 3-D tilt with framer-motion spring physics.
 * Mobile  : Plain <div> — no JS listeners, no motion values, no repaints.
 *           3-D CSS transforms on mobile are very expensive and cause jank.
 */
export default function TiltContainer({ children, className = "", style = {} }) {
    // On mobile, skip all the motion machinery entirely
    if (isMobileDevice()) {
        return (
            <div className={className} style={style}>
                {children}
            </div>
        );
    }

    return <DesktopTilt className={className} style={style}>{children}</DesktopTilt>;
}

function DesktopTilt({ children, className, style }) {
    const ref = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        const checkMotion = () => {
            setReducedMotion(document.body.classList.contains("reduce-motion"));
        };
        checkMotion();

        const observer = new MutationObserver(checkMotion);
        observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    const x = useMotionValue(0.5);
    const y = useMotionValue(0.5);

    const rotateX = useSpring(useTransform(y, [0, 1], [10, -10]), { stiffness: 150, damping: 20 });
    const rotateY = useSpring(useTransform(x, [0, 1], [-10, 10]), { stiffness: 150, damping: 20 });
    const scale = useSpring(isHovered ? 1.025 : 1, { stiffness: 200, damping: 20 });

    const handleMouseMove = (e) => {
        if (reducedMotion || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width);
        y.set((e.clientY - rect.top) / rect.height);
    };

    const handleMouseEnter = () => { if (!reducedMotion) setIsHovered(true); };

    const handleMouseLeave = () => {
        setIsHovered(false);
        x.set(0.5);
        y.set(0.5);
    };

    if (reducedMotion) {
        return <div className={className} style={style}>{children}</div>;
    }

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
                ...style,
                rotateX,
                rotateY,
                scale,
                transformStyle: "preserve-3d",
                perspective: 1000,
            }}
            className={`${className} transition-shadow duration-300`}
        >
            <div style={{ transform: "translateZ(10px)", transformStyle: "preserve-3d" }}>
                {children}
            </div>
        </motion.div>
    );
}
