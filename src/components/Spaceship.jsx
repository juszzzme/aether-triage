import React, { useMemo } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import spaceshipSvg from '../assets/spaceship.svg';

/* ─── Metallic Space Station ─── */
const SpaceStation = ({ position }) => {
    const isTop = position === 'alpha';
    return (
        <div className={`absolute ${isTop ? 'top-4 left-1/2 -translate-x-1/2' : 'bottom-4 left-1/2 -translate-x-1/2'} z-30 pointer-events-none`}>
            <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
                <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
                    {/* Outer structural ring */}
                    <circle cx="60" cy="60" r="55" stroke="#2a2a3a" strokeWidth="1.5" opacity="0.6" />
                    <circle cx="60" cy="60" r="48" stroke="#3a3a4a" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.4" className="animate-[spin_20s_linear_infinite]" />

                    {/* Structural arms */}
                    <line x1="60" y1="5" x2="60" y2="25" stroke="#4a4a5a" strokeWidth="1.5" />
                    <line x1="60" y1="95" x2="60" y2="115" stroke="#4a4a5a" strokeWidth="1.5" />
                    <line x1="5" y1="60" x2="25" y2="60" stroke="#4a4a5a" strokeWidth="1.5" />
                    <line x1="95" y1="60" x2="115" y2="60" stroke="#4a4a5a" strokeWidth="1.5" />

                    {/* Inner docking ring */}
                    <circle cx="60" cy="60" r="18" stroke="#00f5ff" strokeWidth="0.6" opacity="0.3" />
                    <circle cx="60" cy="60" r="12" stroke="#00f5ff" strokeWidth="0.4" opacity="0.15" />

                    {/* Docking clamp indicators */}
                    <rect x="54" y="38" width="12" height="3" rx="1" fill="#00f5ff" opacity="0.2" />
                    <rect x="54" y="79" width="12" height="3" rx="1" fill="#00f5ff" opacity="0.2" />
                    <rect x="38" y="56" width="3" height="8" rx="1" fill="#00f5ff" opacity="0.2" />
                    <rect x="79" y="56" width="3" height="8" rx="1" fill="#00f5ff" opacity="0.2" />

                    {/* Center beacon */}
                    <circle cx="60" cy="60" r="3" fill="#00f5ff" opacity="0.4" className="animate-pulse" />
                </svg>

                {/* Ambient glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,245,255,0.04)_0%,transparent_60%)]" />
            </div>
        </div>
    );
};

/* ─── Dynamic Engine Particles ─── */
const EngineParticles = () => {
    const particles = useMemo(() =>
        Array.from({ length: 8 }, (_, i) => ({
            id: i,
            offsetX: (Math.random() - 0.5) * 10,
            delay: i * 0.12,
            size: Math.random() * 2.5 + 1,
            duration: Math.random() * 0.5 + 0.6,
        })), []
    );

    return (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-16 pointer-events-none">
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                        width: p.size,
                        height: p.size,
                        left: `calc(50% + ${p.offsetX}px)`,
                        top: 0,
                        background: 'radial-gradient(circle, #00f5ff, #b026ff)',
                        boxShadow: '0 0 4px rgba(0,245,255,0.6)',
                    }}
                    animate={{
                        y: [-5, -30 - p.id * 4],
                        opacity: [0.9, 0],
                        scale: [1, 0.2],
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        delay: p.delay,
                        ease: 'easeOut',
                    }}
                />
            ))}
        </div>
    );
};

/* ─── Main Spaceship Component ─── */
const Spaceship = () => {
    const { scrollYProgress } = useScroll();

    // Vertical progress: top station → bottom station
    const yRange = useTransform(scrollYProgress, [0, 1], ['12vh', '82vh']);
    const y = useSpring(yRange, { stiffness: 30, damping: 20 });

    // Gentle sine-wave "exploring" on X axis — stays centered-ish, never over text
    const xWave = useTransform(scrollYProgress, (v) => {
        const base = 50; // center: 50vw
        const amplitude = 6; // only ±6vw from center
        const wave = Math.sin(v * Math.PI * 4) * amplitude;
        return `${base + wave}vw`;
    });
    const x = useSpring(xWave, { stiffness: 25, damping: 18 });

    // Ship faces DOWN (180° rotation since asset faces up)
    // Plus slight tilt on X changes
    const tilt = useTransform(scrollYProgress, (v) => {
        const waveDeriv = Math.cos(v * Math.PI * 4) * 8;
        return 180 + waveDeriv;
    });
    const smoothTilt = useSpring(tilt, { stiffness: 30, damping: 12 });

    // Thruster intensity: faster scroll = more particles
    const thrusterOpacity = useTransform(scrollYProgress, [0, 0.02, 0.98, 1], [0, 1, 1, 0.3]);

    return (
        <>
            {/* Station Alpha — Top */}
            <SpaceStation position="alpha" />

            {/* Station Beta — Bottom */}
            <SpaceStation position="beta" />

            {/* Flying Ship */}
            <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
                <motion.div
                    style={{
                        x, y,
                        rotate: smoothTilt,
                        translateX: '-50%',
                        translateY: '-50%',
                    }}
                    className="absolute w-10 h-10 md:w-14 md:h-14"
                >
                    <img
                        src={spaceshipSvg}
                        alt=""
                        className="w-full h-full select-none"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(0,245,255,0.3))' }}
                        draggable={false}
                    />
                    {/* Engine particles — trail ABOVE ship since ship faces down */}
                    <motion.div style={{ opacity: thrusterOpacity }}>
                        <EngineParticles />
                    </motion.div>
                </motion.div>
            </div>
        </>
    );
};

export default Spaceship;
