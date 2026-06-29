import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export default function TiltContainer({ children, className = "", style = {} }) {
    const ref = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);

    // Track reduce motion class
    useEffect(() => {
        const checkMotion = () => {
            setReducedMotion(document.body.classList.contains("reduce-motion"));
        };
        checkMotion();

        const observer = new MutationObserver(checkMotion);
        observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    // Framer motion values for 3D rotation
    const x = useMotionValue(0.5);
    const y = useMotionValue(0.5);

    // Smooth spring physics for rotation return
    const rotateX = useSpring(useTransform(y, [0, 1], [10, -10]), { stiffness: 150, damping: 20 });
    const rotateY = useSpring(useTransform(x, [0, 1], [-10, 10]), { stiffness: 150, damping: 20 });
    const scale = useSpring(isHovered ? 1.025 : 1, { stiffness: 200, damping: 20 });

    const handleMouseMove = (e) => {
        if (reducedMotion || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Map values to [0, 1] range
        x.set(mouseX / width);
        y.set(mouseY / height);
    };

    const handleMouseEnter = () => {
        if (reducedMotion) return;
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        // Reset to center
        x.set(0.5);
        y.set(0.5);
    };

    if (reducedMotion) {
        return (
            <div className={className} style={style}>
                {children}
            </div>
        );
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
