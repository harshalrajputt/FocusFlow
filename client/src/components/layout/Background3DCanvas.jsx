import { useEffect, useRef } from "react";

export default function Background3DCanvas() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId;
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const isReducedMotion = () => document.body.classList.contains("reduce-motion");

        const getColors = () => {
            const style = getComputedStyle(document.body);
            return {
                accent: style.getPropertyValue("--accent-color").trim() || "#0284c7",
                accentGlow: style.getPropertyValue("--accent-glow").trim() || "rgba(2, 132, 199, 0.15)",
                border: style.getPropertyValue("--border-color").trim() || "rgba(100, 116, 139, 0.12)",
                textMuted: style.getPropertyValue("--text-muted").trim() || "#64748b",
            };
        };

        let colors = getColors();

        // Mouse target and follower spring
        const mouse = { x: width / 2, y: height / 2, lastX: width / 2, lastY: height / 2, speed: 0 };
        const follower = { x: width / 2, y: height / 2 };

        // 3D Icosahedron vertices (glowing cursor companion)
        const t = (1.0 + Math.sqrt(5.0)) / 2.0;
        const icosahedronVertices = [
            { x: -1, y: t, z: 0 }, { x: 1, y: t, z: 0 }, { x: -1, y: -t, z: 0 }, { x: 1, y: -t, z: 0 },
            { x: 0, y: -1, z: t }, { x: 0, y: 1, z: t }, { x: 0, y: -1, z: -t }, { x: 0, y: 1, z: -t },
            { x: t, y: 0, z: -1 }, { x: t, y: 0, z: 1 }, { x: -t, y: 0, z: -1 }, { x: -t, y: 0, z: 1 }
        ];
        // Normalize vertices to target scale
        const icoRadius = 35;
        icosahedronVertices.forEach(v => {
            const length = Math.hypot(v.x, v.y, v.z);
            v.x = (v.x / length) * icoRadius;
            v.y = (v.y / length) * icoRadius;
            v.z = (v.z / length) * icoRadius;
        });

        // 30 Edges of the icosahedron
        const icosahedronEdges = [
            [0, 11], [0, 5], [0, 1], [0, 7], [0, 10],
            [1, 5], [1, 9], [1, 8], [1, 7],
            [2, 11], [2, 4], [2, 5], [2, 10], [2, 11],
            [2, 3], [2, 6], [3, 9], [3, 8], [3, 4],
            [3, 6], [4, 9], [4, 5], [4, 11], [4, 2], [4, 9], [4, 10], [4, 6],
            [5, 9], [5, 11], [6, 10], [6, 8], [7, 10], [7, 8],
            [8, 9], [9, 11]
        ];

        // 3D Cube vertices (for cursor trail particles)
        const cubeVertices = [
            { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
            { x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 }, { x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 }
        ];
        const cubeEdges = [
            [0, 1], [1, 2], [2, 3], [3, 0], // Back
            [4, 5], [5, 6], [6, 7], [7, 4], // Front
            [0, 4], [1, 5], [2, 6], [3, 7]  // Connectors
        ];

        // 3D Rotation matrices helper
        const rotate3D = (point, ax, ay, az) => {
            // X rotation
            let cos = Math.cos(ax), sin = Math.sin(ax);
            let y1 = point.y * cos - point.z * sin;
            let z1 = point.y * sin + point.z * cos;
            
            // Y rotation
            cos = Math.cos(ay); sin = Math.sin(ay);
            let x2 = point.x * cos - z1 * sin;
            let z2 = point.x * sin + z1 * cos;

            // Z rotation
            cos = Math.cos(az); sin = Math.sin(az);
            let x3 = x2 * cos - y1 * sin;
            let y3 = x2 * sin + y1 * cos;

            return { x: x3, y: y3, z: z2 };
        };

        // Rotation angles for main icosahedron
        const icoAngles = { x: 0, y: 0, z: 0 };

        // Cursor 3D Trail list
        const trail = [];
        let frameCount = 0;

        // Perspective Projection calculation
        const project = (x, y, z, cx, cy) => {
            const perspective = 300;
            const scale = perspective / (perspective + z);
            return {
                x: x * scale + cx,
                y: y * scale + cy,
                visible: z > -perspective
            };
        };

        // Render loop
        const animate = () => {
            if (isReducedMotion()) {
                ctx.clearRect(0, 0, width, height);
                return;
            }

            ctx.clearRect(0, 0, width, height);

            frameCount++;

            // 1. Update follower position with spring lag
            follower.x += (mouse.x - follower.x) * 0.08;
            follower.y += (mouse.y - follower.y) * 0.08;

            // 2. Rotate core icosahedron
            // Rotate faster if the mouse is moving
            const rotateSpeed = 0.006 + Math.min(0.05, mouse.speed * 0.002);
            icoAngles.x += rotateSpeed;
            icoAngles.y += rotateSpeed * 1.2;

            // 3. Draw 3D Cursor Follower Icosahedron
            const projectedIco = icosahedronVertices.map(v => {
                const rotated = rotate3D(v, icoAngles.x, icoAngles.y, icoAngles.z);
                return project(rotated.x, rotated.y, rotated.z, follower.x, follower.y);
            });

            // Draw glowing icosahedron faces/edges
            ctx.shadowBlur = 10;
            ctx.shadowColor = colors.accent;
            ctx.lineWidth = 1.2;

            icosahedronEdges.forEach(([start, end]) => {
                const p1 = projectedIco[start];
                const p2 = projectedIco[end];
                if (p1.visible && p2.visible) {
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    // Deeper blue glow lines
                    ctx.strokeStyle = colors.accent + "44";
                    ctx.stroke();
                }
            });

            // Draw vertices
            projectedIco.forEach(p => {
                if (p.visible) {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = colors.accent;
                    ctx.fill();
                }
            });

            // 4. Handle and Draw 3D Cursor Trail Cubes
            // Spawn new cubes as mouse moves
            if (mouse.speed > 1.5 && frameCount % 3 === 0) {
                trail.push({
                    x: mouse.x,
                    y: mouse.y,
                    size: Math.random() * 12 + 6,
                    life: 1.0,
                    ax: Math.random() * Math.PI,
                    ay: Math.random() * Math.PI,
                    az: Math.random() * Math.PI,
                    vax: (Math.random() - 0.5) * 0.08,
                    vay: (Math.random() - 0.5) * 0.08,
                    vaz: (Math.random() - 0.5) * 0.08,
                    color: colors.accent
                });
            }

            // Clean up and draw trail
            for (let i = trail.length - 1; i >= 0; i--) {
                const item = trail[i];
                item.life -= 0.015; // decay life

                if (item.life <= 0) {
                    trail.splice(i, 1);
                    continue;
                }

                // Update cube rotation
                item.ax += item.vax;
                item.ay += item.vay;
                item.az += item.vaz;

                // Scale cube points
                const curCubeVertices = cubeVertices.map(v => ({
                    x: v.x * item.size * item.life,
                    y: v.y * item.size * item.life,
                    z: v.z * item.size * item.life
                }));

                const projectedCube = curCubeVertices.map(v => {
                    const rotated = rotate3D(v, item.ax, item.ay, item.az);
                    return project(rotated.x, rotated.y, rotated.z, item.x, item.y);
                });

                // Draw cube edges with fading opacity
                ctx.lineWidth = 1.0 * item.life;
                ctx.shadowBlur = 5 * item.life;
                ctx.shadowColor = item.color;
                
                cubeEdges.forEach(([start, end]) => {
                    const p1 = projectedCube[start];
                    const p2 = projectedCube[end];
                    if (p1.visible && p2.visible) {
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        const opacity = Math.floor(item.life * 0.25 * 255).toString(16).padStart(2, "0");
                        ctx.strokeStyle = item.color + opacity;
                        ctx.stroke();
                    }
                });
            }

            // Reset shadows
            ctx.shadowBlur = 0;

            // Decelerate mouse speed calculation
            mouse.speed *= 0.95;

            animationFrameId = requestAnimationFrame(animate);
        };

        // Mouse listeners
        const handleMouseMove = (e) => {
            mouse.speed = Math.hypot(e.clientX - mouse.x, e.clientY - mouse.y);
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        const handleMouseLeave = () => {
            // center follower
            mouse.x = width / 2;
            mouse.y = height / 2;
            mouse.speed = 0;
        };

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        const observer = new MutationObserver(() => {
            colors = getColors();
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseleave", handleMouseLeave);
        window.addEventListener("resize", handleResize);

        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseleave", handleMouseLeave);
            window.removeEventListener("resize", handleResize);
            observer.disconnect();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none transition-opacity duration-1000"
            style={{ 
                zIndex: 9999, // Overlay above all content elements so the trail is visible on top of cards
                mixBlendMode: "normal", 
                opacity: 0.95 
            }}
        />
    );
}
