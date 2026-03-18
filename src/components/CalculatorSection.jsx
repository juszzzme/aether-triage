import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import SectionReveal from './SectionReveal';

const CalculatorSection = () => {
    const [ticketsPerDay, setTicketsPerDay] = useState(500);
    const [mode, setMode] = useState('Balanced');
    const canvasRef = useRef(null);

    const modeData = {
        Conservative: {
            resolvePct: 45, color: '#39ff14', avgTime: '8 min',
            speed: 0.005, noise: 2, period: 300 // Significantly slower speed
        },
        Balanced: {
            resolvePct: 68, color: '#ffba08', avgTime: '3 min',
            speed: 0.01, noise: 4, period: 200
        },
        Aggressive: {
            resolvePct: 89, color: '#b026ff', avgTime: '45 sec',
            speed: 0.03, noise: 8, period: 80
        },
    };

    const current = modeData[mode];
    const autoResolved = Math.round(ticketsPerDay * (current.resolvePct / 100));

    // Draw throughput chart with mode-specific pacing
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width = canvas.offsetWidth * 2;
        const h = canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);
        const cw = canvas.offsetWidth;
        const ch = canvas.offsetHeight;
        let animationFrameId;
        let offset = 0;

        const render = () => {
            ctx.clearRect(0, 0, cw, ch);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            const points = 60;
            const aiLine = [];

            // Generate flowing wave data
            for (let i = 0; i < points; i++) {
                const x = (i / (points - 1)) * cw;
                const time = offset * current.speed; // Speed varies by mode

                const improvement = (i / points) * (current.resolvePct / 100) * (ch * 0.4);

                // Smoother base wave (slower)
                const wave = Math.sin(i * 0.15 + time) * 5;

                // "Pacing" noise - reduced intensity
                const noise = (Math.sin(i * 0.3 - time * 2) * current.noise);

                let ay = ch * 0.65 - improvement + wave + noise;

                // Vertical Pause at peaks (simulation)
                // Not strictly necessary for visual flow, but keeping wave smooth is key

                aiLine.push({ x, y: ay });
            }

            // Draw AI Line (Glowing)
            ctx.beginPath();
            ctx.strokeStyle = current.color;
            ctx.lineWidth = 2;
            ctx.shadowColor = current.color;
            ctx.shadowBlur = mode === 'Aggressive' ? 20 : 10;
            aiLine.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Gradient Fill
            ctx.beginPath();
            ctx.moveTo(0, ch);
            aiLine.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.lineTo(cw, ch);
            const gradient = ctx.createLinearGradient(0, 0, 0, ch);
            gradient.addColorStop(0, current.color + '20');
            gradient.addColorStop(1, current.color + '00');
            ctx.fillStyle = gradient;
            ctx.fill();

            offset++;
            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationFrameId);
    }, [mode, current]);

    return (
        <section className="relative min-h-[80vh] flex flex-col items-center justify-center bg-transparent py-24 md:py-32">
            <SectionReveal>
                <div className="relative z-10 max-w-5xl mx-auto px-6 w-full">
                    <div className="mb-10 text-center md:text-left">
                        <span className="text-[0.65rem] font-mono text-neon-cyan/60 tracking-widest border border-neon-cyan/20 px-3 py-1 uppercase"> [ &nbsp; Throughput Simulator &nbsp; ] </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        {/* Controls */}
                        <div>
                            <h2 className="text-4xl md:text-6xl font-display font-medium text-white mb-6">
                                Processing <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-electric-purple to-hot-pink font-bold tabular-nums">
                                    {ticketsPerDay.toLocaleString()}
                                </span>
                                <span className="text-2xl text-cloud-dancer/50 font-body"> tickets/day</span>
                            </h2>

                            <div className="flex gap-4 mb-8">
                                {['Conservative', 'Balanced', 'Aggressive'].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setMode(m)}
                                        className={`px-4 py-2 rounded text-xs font-mono tracking-wider border transition-all duration-300 ${mode === m ? 'bg-white/10 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'border-white/10 text-white/40 hover:text-white hover:border-white/30'}`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4 font-body">
                                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                    <span className="text-sm text-cloud-dancer/60">Auto-Resolution</span>
                                    <span className="text-xl font-mono text-neon-cyan tabular-nums">{autoResolved} ({current.resolvePct}%)</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                    <span className="text-sm text-cloud-dancer/60">Avg Response Time</span>
                                    <span className="text-xl font-mono text-white tabular-nums">{current.avgTime}</span>
                                </div>
                            </div>
                        </div>

                        {/* Live Chart */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 to-electric-purple/10 blur-xl opacity-20 -z-10" />
                            <div className="border border-white/10 bg-midnight-navy/50 backdrop-blur-sm rounded-2xl p-2 overflow-hidden shadow-2xl">
                                <canvas ref={canvasRef} className="w-full h-64 md:h-80 rounded-xl" style={{ imageRendering: 'auto' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </SectionReveal>
        </section>
    );
};

export default CalculatorSection;
