import { useEffect, useRef } from "react";

export default function Background3DCanvas() {
    const bgCanvasRef = useRef(null);
    const fgCanvasRef = useRef(null);

    useEffect(() => {
        const bgCanvas = bgCanvasRef.current;
        const fgCanvas = fgCanvasRef.current;
        if (!bgCanvas || !fgCanvas) return;

        const bgCtx = bgCanvas.getContext("2d");
        const fgCtx = fgCanvas.getContext("2d");
        if (!bgCtx || !fgCtx) return;

        let animationFrameId;
        let width = (bgCanvas.width = fgCanvas.width = window.innerWidth);
        let height = (bgCanvas.height = fgCanvas.height = window.innerHeight);

        const isReducedMotion = () => document.body.classList.contains("reduce-motion");

        const getColors = () => {
            const style = getComputedStyle(document.body);
            return {
                accent: style.getPropertyValue("--accent-color").trim() || "#0284c7",
                border: style.getPropertyValue("--border-color").trim() || "rgba(100, 116, 139, 0.12)",
                textMuted: style.getPropertyValue("--text-muted").trim() || "#64748b",
            };
        };

        let colors = getColors();

        // 1. CONSTELLATION BACKGROUND SETUP
        const bgParticleCount = Math.min(50, Math.floor((width * height) / 30000));
        const bgParticles = [];
        const mouse = { x: width / 2, y: height / 2, speed: 0, radius: 150 };

        class BGParticle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.z = Math.random() * 1.5 + 0.5; // depth
                this.vx = (Math.random() - 0.5) * 0.35;
                this.vy = (Math.random() - 0.5) * 0.35;
                this.radius = (Math.random() * 1.8 + 0.8) * this.z;
            }

            update() {
                this.x += this.vx * this.z;
                this.y += this.vy * this.z;

                // Wrap boundaries
                if (this.x < 0) this.x = width;
                if (this.x > width) this.x = 0;
                if (this.y < 0) this.y = height;
                if (this.y > height) this.y = 0;

                // Mouse push force
                if (mouse.x !== null && mouse.y !== null) {
                    const dx = this.x - mouse.x;
                    const dy = this.y - mouse.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < mouse.radius) {
                        const force = (mouse.radius - dist) / mouse.radius;
                        const angle = Math.atan2(dy, dx);
                        const targetX = this.x + Math.cos(angle) * force * 12;
                        const targetY = this.y + Math.sin(angle) * force * 12;
                        
                        this.x += (targetX - this.x) * 0.08;
                        this.y += (targetY - this.y) * 0.08;
                    }
                }
            }

            draw() {
                bgCtx.beginPath();
                bgCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                bgCtx.fillStyle = colors.accent + "22";
                bgCtx.fill();
            }
        }

        const initBG = () => {
            bgParticles.length = 0;
            for (let i = 0; i < bgParticleCount; i++) {
                bgParticles.push(new BGParticle());
            }
        };

        const drawBGLines = () => {
            for (let i = 0; i < bgParticles.length; i++) {
                for (let j = i + 1; j < bgParticles.length; j++) {
                    const dx = bgParticles[i].x - bgParticles[j].x;
                    const dy = bgParticles[i].y - bgParticles[j].y;
                    const dist = Math.hypot(dx, dy);
                    const maxDist = 110;

                    if (dist < maxDist) {
                        const alpha = ((maxDist - dist) / maxDist) * 0.09 * (bgParticles[i].z * bgParticles[j].z);
                        bgCtx.beginPath();
                        bgCtx.moveTo(bgParticles[i].x, bgParticles[i].y);
                        bgCtx.lineTo(bgParticles[j].x, bgParticles[j].y);
                        bgCtx.strokeStyle = colors.accent + Math.floor(alpha * 255).toString(16).padStart(2, "0");
                        bgCtx.lineWidth = 0.7 * bgParticles[i].z;
                        bgCtx.stroke();
                    }
                }
            }
        };


        // 2. FOREGROUND 3D CURSOR TRAIL SETUP
        const cubeVertices = [
            { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
            { x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 }, { x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 }
        ];
        const cubeEdges = [
            [0, 1], [1, 2], [2, 3], [3, 0], // Back
            [4, 5], [5, 6], [6, 7], [7, 4], // Front
            [0, 4], [1, 5], [2, 6], [3, 7]  // Connectors
        ];

        const rotate3D = (point, ax, ay, az) => {
            let cos = Math.cos(ax), sin = Math.sin(ax);
            let y1 = point.y * cos - point.z * sin;
            let z1 = point.y * sin + point.z * cos;
            
            cos = Math.cos(ay); sin = Math.sin(ay);
            let x2 = point.x * cos - z1 * sin;
            let z2 = point.x * sin + z1 * cos;

            cos = Math.cos(az); sin = Math.sin(az);
            let x3 = x2 * cos - y1 * sin;
            let y3 = x2 * sin + y1 * cos;

            return { x: x3, y: y3, z: z2 };
        };

        const project = (x, y, z, cx, cy) => {
            const perspective = 300;
            const scale = perspective / (perspective + z);
            return {
                x: x * scale + cx,
                y: y * scale + cy,
                visible: z > -perspective
            };
        };

        const trail = [];
        let frameCount = 0;


        // 3. ANIMATION RENDERING LOOP
        const animate = () => {
            if (isReducedMotion()) {
                bgCtx.clearRect(0, 0, width, height);
                fgCtx.clearRect(0, 0, width, height);
                return;
            }

            // Clear canvases
            bgCtx.clearRect(0, 0, width, height);
            fgCtx.clearRect(0, 0, width, height);

            frameCount++;

            // ─── A. BACKGROUND CONSTELLATION ───
            // Draw ambient cursor spotlight glow
            if (mouse.x !== null && mouse.y !== null) {
                const grad = bgCtx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 250);
                grad.addColorStop(0, colors.accent + "09");
                grad.addColorStop(1, "transparent");
                bgCtx.fillStyle = grad;
                bgCtx.fillRect(0, 0, width, height);
            }

            bgParticles.forEach((p) => {
                p.update();
                p.draw();
            });
            drawBGLines();

            // ─── B. FOREGROUND 3D CURSOR TRAIL ───
            // Spawn cubes on movement
            if (mouse.speed > 1.5 && frameCount % 3 === 0) {
                trail.push({
                    x: mouse.x,
                    y: mouse.y,
                    size: Math.random() * 11 + 5,
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

            // Draw and decay trail
            for (let i = trail.length - 1; i >= 0; i--) {
                const item = trail[i];
                item.life -= 0.018; // decay speed

                if (item.life <= 0) {
                    trail.splice(i, 1);
                    continue;
                }

                item.ax += item.vax;
                item.ay += item.vay;
                item.az += item.vaz;

                const curCubeVertices = cubeVertices.map(v => ({
                    x: v.x * item.size * item.life,
                    y: v.y * item.size * item.life,
                    z: v.z * item.size * item.life
                }));

                const projectedCube = curCubeVertices.map(v => {
                    const rotated = rotate3D(v, item.ax, item.ay, item.az);
                    return project(rotated.x, rotated.y, rotated.z, item.x, item.y);
                });

                fgCtx.lineWidth = 0.9 * item.life;
                fgCtx.shadowBlur = 4 * item.life;
                fgCtx.shadowColor = item.color;
                
                cubeEdges.forEach(([start, end]) => {
                    const p1 = projectedCube[start];
                    const p2 = projectedCube[end];
                    if (p1.visible && p2.visible) {
                        fgCtx.beginPath();
                        fgCtx.moveTo(p1.x, p1.y);
                        fgCtx.lineTo(p2.x, p2.y);
                        const opacity = Math.floor(item.life * 0.22 * 255).toString(16).padStart(2, "0");
                        fgCtx.strokeStyle = item.color + opacity;
                        fgCtx.stroke();
                    }
                });
            }

            fgCtx.shadowBlur = 0; // reset
            mouse.speed *= 0.94; // decelerate

            animationFrameId = requestAnimationFrame(animate);
        };

        // Listeners
        const handleMouseMove = (e) => {
            mouse.speed = Math.hypot(e.clientX - mouse.x, e.clientY - mouse.y);
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        const handleMouseLeave = () => {
            mouse.x = null;
            mouse.y = null;
            mouse.speed = 0;
        };

        const handleResize = () => {
            width = bgCanvas.width = fgCanvas.width = window.innerWidth;
            height = bgCanvas.height = fgCanvas.height = window.innerHeight;
            initBG();
        };

        const observer = new MutationObserver(() => {
            colors = getColors();
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseleave", handleMouseLeave);
        window.addEventListener("resize", handleResize);

        initBG();
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
        <>
            {/* Background Constellation Canvas */}
            <canvas
                ref={bgCanvasRef}
                className="fixed inset-0 pointer-events-none z-[-1]"
                style={{ mixBlendMode: "normal", opacity: 0.8 }}
            />
            {/* Foreground 3D Cursor Trail Canvas */}
            <canvas
                ref={fgCanvasRef}
                className="fixed inset-0 pointer-events-none z-[9999]"
                style={{ mixBlendMode: "normal", opacity: 0.95 }}
            />
        </>
    );
}
