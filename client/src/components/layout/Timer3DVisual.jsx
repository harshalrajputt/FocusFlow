import { useEffect, useRef } from "react";
import { isMobileDevice } from "../../utils/deviceUtils";

/**
 * Timer3DVisual
 * -------------
 * Desktop : 120 sphere points, 60 fps.
 * Mobile  : 40 sphere points, ~30 fps (frame-skip).
 *           shadowBlur disabled (very expensive on mobile GPU).
 */
export default function Timer3DVisual({ running, color, completed }) {
    const canvasRef = useRef(null);
    const isMobile = isMobileDevice();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId;
        const width = (canvas.width = 240);
        const height = (canvas.height = 240);
        const cx = width / 2;
        const cy = height / 2;

        const radius = 80;
        const points = [];
        // Mobile: 40 pts instead of 120 → 3× less work per frame
        const numPoints = isMobile ? 40 : 120;
        let angleX = 0.005;
        let angleY = 0.005;

        const explosions = [];

        for (let i = 0; i < numPoints; i++) {
            const theta = Math.acos(Math.random() * 2 - 1);
            const phi = Math.random() * Math.PI * 2;
            points.push({
                x: radius * Math.sin(theta) * Math.cos(phi),
                y: radius * Math.sin(theta) * Math.sin(phi),
                z: radius * Math.cos(theta),
            });
        }

        const rotateX3D = (point, rad) => {
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const y1 = point.y * cos - point.z * sin;
            const z1 = point.y * sin + point.z * cos;
            point.y = y1;
            point.z = z1;
        };

        const rotateY3D = (point, rad) => {
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const x1 = point.x * cos - point.z * sin;
            const z1 = point.x * sin + point.z * cos;
            point.x = x1;
            point.z = z1;
        };

        const createExplosion = () => {
            explosions.length = 0;
            // Mobile: 40 confetti particles instead of 80
            const count = isMobile ? 40 : 80;
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 4 + 2;
                explosions.push({
                    x: cx, y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1,
                    size: Math.random() * 3 + 1,
                    alpha: 1,
                    color: `hsl(${Math.random() * 360}, 85%, 60%)`,
                });
            }
        };

        if (completed) createExplosion();

        // Mobile frame-skip: render at ~30fps instead of 60fps
        let lastTime = 0;
        const targetInterval = isMobile ? 1000 / 30 : 0; // 0 = no skip on desktop

        const animate = (timestamp) => {
            animationFrameId = requestAnimationFrame(animate);

            if (isMobile && timestamp - lastTime < targetInterval) return;
            lastTime = timestamp;

            ctx.clearRect(0, 0, width, height);

            const rx = running ? angleX * 2.5 : angleX * 0.8;
            const ry = running ? angleY * 2.5 : angleY * 0.8;

            points.forEach((p) => {
                rotateX3D(p, rx);
                rotateY3D(p, ry);
            });

            const sorted = [...points].sort((a, b) => a.z - b.z);

            // Skip mesh lines on mobile to save draw calls
            if (!isMobile) {
                ctx.strokeStyle = color + "07";
                ctx.lineWidth = 0.5;
                for (let i = 0; i < sorted.length; i += 6) {
                    ctx.beginPath();
                    ctx.moveTo(sorted[i].x + cx, sorted[i].y + cy);
                    for (let j = 1; j < 4; j++) {
                        const idx = (i + j) % sorted.length;
                        ctx.lineTo(sorted[idx].x + cx, sorted[idx].y + cy);
                    }
                    ctx.stroke();
                }
            }

            sorted.forEach((p) => {
                const size = ((p.z + radius) / (radius * 2)) * 3 + 1.2;
                const alpha = ((p.z + radius) / (radius * 2)) * 0.6 + 0.15;

                ctx.beginPath();
                ctx.arc(p.x + cx, p.y + cy, size, 0, Math.PI * 2);
                ctx.fillStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, "00");
                ctx.fill();
            });

            for (let i = explosions.length - 1; i >= 0; i--) {
                const particle = explosions[i];
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.08;
                particle.alpha -= 0.015;

                if (particle.alpha <= 0) {
                    explosions.splice(i, 1);
                } else {
                    ctx.beginPath();
                    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    ctx.fillStyle = particle.color;
                    ctx.globalAlpha = particle.alpha;
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                }
            }
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => { cancelAnimationFrame(animationFrameId); };
    }, [running, color, completed, isMobile]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-0"
            style={{ width: 240, height: 240 }}
        />
    );
}
