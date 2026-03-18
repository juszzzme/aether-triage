import React, { useRef, useMemo, useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

/* ── Shooting Star ── */
const ShootingStar = ({ delay }) => {
    const angle = useMemo(() => 25 + Math.random() * 20, []);
    const startX = useMemo(() => Math.random() * 100, []);
    const startY = useMemo(() => Math.random() * 40, []);
    const length = useMemo(() => 80 + Math.random() * 60, []);

    return (
        <motion.div
            className="absolute"
            style={{
                top: `${startY}%`,
                left: `${startX}%`,
                width: `${length}px`,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                transform: `rotate(${angle}deg)`,
                transformOrigin: 'left center',
            }}
            animate={{ opacity: [0, 0.7, 0], x: [0, 200], y: [0, 120] }}
            transition={{
                duration: 1.2,
                repeat: Infinity,
                repeatDelay: 8 + delay * 4,
                delay: delay * 5,
                ease: 'easeIn',
            }}
        />
    );
};

const ParallaxBackground = () => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end end"]
    });

    // Very subtle parallax for faint elements
    const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);

    // Static starfield with fixed positions (no random on each render)
    const stars = useMemo(() =>
        Array.from({ length: 60 }, (_, i) => ({
            id: i,
            top: (i * 17.3 + 7) % 100,
            left: (i * 23.7 + 13) % 100,
            size: (i % 3 === 0) ? 1.5 : 1,
            opacity: 0.15 + (i % 5) * 0.08,
            duration: 3 + (i % 4),
        })), []
    );

    return (
        <div ref={ref} className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{ backgroundColor: '#000000' }}>
            {/* 80% — Pure black void (handled by bg color above) */}

            {/* 20% — Extremely subtle dark accents */}
            <div className="absolute top-[30%] right-[-5%] w-[50vw] h-[50vw] bg-[#0a0a12] rounded-full blur-[150px] opacity-40" />
            <div className="absolute bottom-[20%] left-[-10%] w-[40vw] h-[40vw] bg-[#08080f] rounded-full blur-[120px] opacity-30" />

            {/* Starfield — tiny twinkling dots */}
            <div className="absolute inset-0">
                {stars.map(s => (
                    <div
                        key={s.id}
                        className="absolute bg-white rounded-full animate-pulse"
                        style={{
                            top: `${s.top}%`,
                            left: `${s.left}%`,
                            width: `${s.size}px`,
                            height: `${s.size}px`,
                            opacity: s.opacity,
                            animationDuration: `${s.duration}s`,
                        }}
                    />
                ))}
            </div>

            {/* Shooting Stars — 1-2 every ~10 seconds */}
            <ShootingStar delay={0} />
            <ShootingStar delay={1} />

            {/* Very faint planetary silhouette — barely visible dark grey */}
            <motion.div
                style={{ y: y1 }}
                className="absolute top-[60%] right-[8%] w-16 h-16 rounded-full opacity-[0.06]"
                style={{ background: 'radial-gradient(circle, #111118, #000000)' }}
            />
        </div>
    );
};

export default ParallaxBackground;
