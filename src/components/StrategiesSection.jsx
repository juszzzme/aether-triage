import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SectionReveal from './SectionReveal';
import { IconShield, IconTarget, IconRouting } from './Icons';

const modules = [
    {
        name: 'PII Masker',
        icon: <IconShield className="w-10 h-10" />,
        color: '#39ff14', // Neon Green
        description: 'Detects and redacts personally identifiable information — Aadhaar, PAN, phone, UPI IDs, card numbers — in real-time.',
        stats: { accuracy: '99.2%', speed: '12ms' }
    },
    {
        name: 'Intent Classifier',
        icon: <IconRouting className="w-10 h-10" />,
        color: '#00f5ff', // Neon Cyan
        description: 'Multi-intent detection with Hinglish support. Classifies refund requests, fraud reports, status checks, and more.',
        stats: { accuracy: '94.8%', speed: '45ms' }
    },
    {
        name: 'Fraud Detector',
        icon: <IconTarget className="w-10 h-10" />,
        color: '#b026ff', // Electric Purple
        description: 'Real-time scoring using transaction patterns. Auto-escalates critical cases to fraud teams immediately.',
        stats: { accuracy: '96.5%', speed: '80ms' }
    },
];

const StrategiesSection = () => {
    const [active, setActive] = useState('PII Masker');

    return (
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center bg-transparent overflow-hidden py-32">
            <SectionReveal>
                <div className="relative z-10 max-w-6xl mx-auto px-6 w-full">

                    <div className="text-center mb-16">
                        <span className="text-[0.65rem] font-mono text-neon-cyan/60 tracking-widest border border-neon-cyan/20 px-3 py-1 uppercase bg-deep-space/50 backdrop-blur">
                            [ &nbsp; Core Modules &nbsp; ]
                        </span>
                        <h2 className="text-4xl md:text-6xl font-display font-bold text-white mt-6 mb-4 tracking-wide">
                            Intelligent Pipeline
                        </h2>
                        <p className="text-cloud-dancer/60 max-w-xl mx-auto font-body text-lg">
                            Three powerful engines working in sync to secure, classify, and resolve.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {modules.map((mod, i) => (
                            <motion.div
                                key={mod.name}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15 }}
                                onMouseEnter={() => setActive(mod.name)}
                                className="group relative p-8 rounded-2xl bg-midnight-navy/40 border border-white/5 overflow-hidden transition-all duration-500 hover:-translate-y-2 backdrop-blur-sm"
                                style={{
                                    boxShadow: active === mod.name ? `0 20px 40px -10px ${mod.color}20` : 'none'
                                }}
                            >
                                {/* Active Gradient Border */}
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                    style={{
                                        background: `linear-gradient(135deg, ${mod.color}15, transparent 60%)`
                                    }}
                                />

                                {/* Edge Lighting */}
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
                                <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-transparent via-white/20 to-transparent scale-y-0 group-hover:scale-y-100 transition-transform duration-700" />

                                {/* Icon */}
                                <div
                                    className="relative w-16 h-16 rounded-xl flex items-center justify-center mb-6 transition-colors duration-300"
                                    style={{
                                        backgroundColor: active === mod.name ? `${mod.color}20` : 'rgba(255,255,255,0.03)',
                                        color: active === mod.name ? mod.color : 'white'
                                    }}
                                >
                                    {mod.icon}
                                </div>

                                <h3 className="text-2xl font-display font-bold text-white mb-3 group-hover:text-neon-cyan transition-colors">
                                    {mod.name}
                                </h3>

                                <p className="text-cloud-dancer/70 text-sm leading-relaxed mb-8 font-body">
                                    {mod.description}
                                </p>

                                {/* Stats Footer */}
                                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-wider text-white/30 font-mono">Accuracy</div>
                                        <div className="font-mono text-neon-cyan">{mod.stats.accuracy}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] uppercase tracking-wider text-white/30 font-mono">Speed</div>
                                        <div className="font-mono text-electric-purple">{mod.stats.speed}</div>
                                    </div>
                                </div>

                            </motion.div>
                        ))}
                    </div>
                </div>
            </SectionReveal>
        </section>
    );
};

export default StrategiesSection;
