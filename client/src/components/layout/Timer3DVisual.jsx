import { useEffect, useRef } from "react";

export default function Timer3DVisual({ running, color, completed }) {
    const canvasRef = useRef(null);

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
        
        // Sphere properties
        const radius = 80;
        const points = [];
        const numPoints = 120;
        let angleX = 0.005;
        let angleY = 0.005;

        // Confetti explosion particles
        const explosions = [];

        // Generate points on sphere surface
        for (let i = 0; i < numPoints; i++) {
            const theta = Math.acos(Math.random() * 2 - 1);
            const phi = Math.random() * Math.PI * 2;
            points.push({
                x: radius * Math.sin(theta) * Math.cos(phi),
                y: radius * Math.sin(theta) * Math.sin(phi),
                z: radius * Math.cos(theta),
            });
        }

        // 3D rotation maths
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

        // Create confetti burst
        const createExplosion = () => {
            explosions.length = 0;
            for (let i = 0; i < 80; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 4 + 2;
                explosions.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1, // slight float upward
                    size: Math.random() * 3 + 1,
                    alpha: 1,
                    color: `hsl(${Math.random() * 360}, 85%, 60%)`,
                });
            }
        };

        if (completed) {
            createExplosion();
        }

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // 1. Draw 3D Sphere of points
            // Adjust speed based on whether the timer is running
            const rx = running ? angleX * 2.5 : angleX * 0.8;
            const ry = running ? angleY * 2.5 : angleY * 0.8;

            // Sort points by Z (depth buffer) to draw back-to-front
            points.forEach((p) => {
                rotateX3D(p, rx);
                rotateY3D(p, ry);
            });

            const sorted = [...points].sort((a, b) => a.z - b.z);

            // Draw connecting longitude/latitude lines dynamically
            ctx.strokeStyle = color + "07"; // subtle mesh line opacity
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

            sorted.forEach((p) => {
                const size = ((p.z + radius) / (radius * 2)) * 3 + 1.2; // Perspective sizing
                const alpha = ((p.z + radius) / (radius * 2)) * 0.6 + 0.15; // Perspective opacity

                ctx.beginPath();
                ctx.arc(p.x + cx, p.y + cy, size, 0, Math.PI * 2);
                ctx.fillStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, "0");
                ctx.fill();
            });

            // 2. Render and update confetti explosion if completed
            for (let i = explosions.length - 1; i >= 0; i--) {
                const particle = explosions[i];
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.08; // gravity
                particle.alpha -= 0.015; // fade out

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

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [running, color, completed]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-0"
            style={{ width: 240, height: 240 }}
        />
    );
}
