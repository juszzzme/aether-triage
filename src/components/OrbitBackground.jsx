import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════
// 1. FILM GRAIN NOISE OVERLAY
// ═══════════════════════════════════════════════════════════════════════════
const FilmGrain = () => (
    <div 
        className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay"
        style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
    />
);

// ═══════════════════════════════════════════════════════════════════════════
// 2. MULTI-LAYERED PARALLAX STARFIELD (3 Depth Layers)
// ═══════════════════════════════════════════════════════════════════════════
const StarLayer = ({ count, sizeRange, opacityRange, speed }) => {
    const stars = useMemo(() => 
        Array.from({ length: count }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * (sizeRange[1] - sizeRange[0]) + sizeRange[0],
            opacity: Math.random() * (opacityRange[1] - opacityRange[0]) + opacityRange[0],
            twinkleDuration: Math.random() * 4 + 3,
        }))
    , [count, sizeRange, opacityRange]);

    return (
        <div className="absolute inset-0 pointer-events-none">
            {stars.map((star) => (
                <motion.div
                    key={star.id}
                    className="absolute rounded-full bg-white"
                    style={{
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        width: `${star.size}px`,
                        height: `${star.size}px`,
                    }}
                    animate={{
                        y: ['0vh', '-120vh'],
                        opacity: [star.opacity * 0.3, star.opacity, star.opacity * 0.5, star.opacity],
                    }}
                    transition={{
                        y: {
                            duration: speed,
                            repeat: Infinity,
                            ease: "linear",
                        },
                        opacity: {
                            duration: star.twinkleDuration,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }
                    }}
                />
            ))}
        </div>
    );
};

const StarField = () => (
    <>
        {/* Far Stars (Small, Faint, Slow) */}
        <StarLayer count={80} sizeRange={[0.5, 1]} opacityRange={[0.2, 0.4]} speed={180} />
        
        {/* Mid Stars (Medium, Moderate) */}
        <StarLayer count={50} sizeRange={[1, 1.5]} opacityRange={[0.4, 0.6]} speed={120} />
        
        {/* Near Stars (Large, Bright, Fast) */}
        <StarLayer count={30} sizeRange={[1.5, 2.5]} opacityRange={[0.5, 0.8]} speed={80} />
    </>
);

// ═══════════════════════════════════════════════════════════════════════════
// 3. GYROSCOPIC ORBIT RING (Light Trails, Not Lines)
// ═══════════════════════════════════════════════════════════════════════════
const OrbitRing = ({ diameter, speed, rotateY = 0, rotateZ = 0 }) => (
    <motion.div
        className="absolute pointer-events-none"
        style={{
            width: diameter,
            height: diameter,
            transform: `rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
            transformStyle: 'preserve-3d',
        }}
        animate={{
            rotateZ: [0, 360],
        }}
        transition={{
            duration: speed,
            repeat: Infinity,
            ease: "linear",
        }}
    >
        {/* Conic Gradient: Light Trail */}
        <div 
            className="absolute inset-0 rounded-full"
            style={{
                background: `conic-gradient(
                    from 0deg, 
                    transparent 0%, 
                    rgba(255, 255, 255, 0.03) 25%,
                    rgba(255, 255, 255, 0.08) 50%, 
                    rgba(255, 255, 255, 0.03) 75%,
                    transparent 100%
                )`,
                mixBlendMode: 'screen',
            }}
        />
        
        {/* Subtle Glass Edge */}
        <div 
            className="absolute inset-0 rounded-full"
            style={{
                background: `radial-gradient(
                    circle,
                    transparent 98%,
                    rgba(255, 255, 255, 0.05) 99%,
                    transparent 100%
                )`,
                mixBlendMode: 'overlay',
            }}
        />
    </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════
// 4. MAIN BACKGROUND SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
const OrbitBackground = () => {
    return (
        <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
            
            {/* ─── THE VOID (Deep Space Texture) ─── */}
            <div 
                className="absolute inset-0"
                style={{
                    background: `
                        radial-gradient(ellipse at 20% 30%, rgba(10, 14, 39, 0.4) 0%, transparent 50%),
                        radial-gradient(ellipse at 80% 70%, rgba(6, 4, 26, 0.5) 0%, transparent 50%),
                        linear-gradient(to bottom, #000000, #02040a, #000000)
                    `,
                }}
            />
            
            {/* ─── FILM GRAIN ─── */}
            <FilmGrain />
            
            {/* ─── STARFIELD (Parallax Layers) ─── */}
            <StarField />
            
            {/* ─── THE GYROSCOPIC ORBIT SYSTEM ─── */}
            <div 
                className="absolute inset-0 flex items-center justify-center"
                style={{
                    perspective: '1000px',
                    perspectiveOrigin: 'center center',
                    // RADIAL MASK: Center is hollow (0-40% transparent), edges visible
                    maskImage: 'radial-gradient(circle at center, transparent 0%, transparent 35%, black 60%, black 100%)',
                    WebkitMaskImage: 'radial-gradient(circle at center, transparent 0%, transparent 35%, black 60%, black 100%)',
                }}
            >
                <div 
                    className="relative w-full h-full flex items-center justify-center"
                    style={{
                        transform: 'rotateX(60deg)',
                        transformStyle: 'preserve-3d',
                    }}
                >
                    {/* Outer Ring: Slowest, Largest */}
                    <OrbitRing diameter="min(90vw, 90vh)" speed={140} rotateY={5} rotateZ={0} />
                    
                    {/* Middle Ring: Counter-Rotation */}
                    <OrbitRing diameter="min(70vw, 70vh)" speed={100} rotateY={-3} rotateZ={10} />
                    
                    {/* Inner Ring: Fastest */}
                    <OrbitRing diameter="min(50vw, 50vh)" speed={70} rotateY={2} rotateZ={-5} />
                </div>
            </div>

            {/* ─── ATMOSPHERIC DEPTH (Vignette) ─── */}
            <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.8) 100%)',
                }}
            />
        </div>
    );
};

export default OrbitBackground;
