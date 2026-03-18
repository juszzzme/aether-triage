import React from 'react';
import { motion } from 'framer-motion';

const Hero = () => {
    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-transparent pt-20">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-deep-space via-transparent to-transparent opacity-60" />

            {/* Main Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 text-center flex flex-col items-center gap-16">

                {/* Typography */}
                <div className="space-y-8 max-w-5xl relative z-20">
                    <motion.h1
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                        className="text-6xl md:text-8xl lg:text-[9rem] font-display font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/10 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    >
                        TRIAGE
                        <span className="block text-3xl md:text-4xl lg:text-5xl font-mono font-light tracking-[0.2em] mt-4 opacity-70 text-neon-cyan">A.I. OPS</span>
                    </motion.h1>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 1 }}
                        className="flex flex-col md:flex-row items-center justify-center gap-6 text-sm md:text-lg text-cloud-dancer/60 font-body font-light tracking-wide uppercase"
                    >
                        <span>Banking Intelligence</span>
                        <span className="hidden md:block w-1.5 h-1.5 bg-neon-cyan rounded-full shadow-[0_0_10px_#00f5ff]" />
                        <span>Real-time Classification</span>
                        <span className="hidden md:block w-1.5 h-1.5 bg-electric-purple rounded-full shadow-[0_0_10px_#b026ff]" />
                        <span>Automated Resolution</span>
                    </motion.div>
                </div>

            </div>
        </div>
    );
};

export default Hero;
