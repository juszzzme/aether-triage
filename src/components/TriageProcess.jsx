import React from 'react';
import { motion } from 'framer-motion';
import { Cloud, CheckCircle, ShieldAlert } from 'lucide-react';
import { Brain } from 'lucide-react';

const TriageProcess = () => {
    const steps = [
        {
            id: 1,
            title: "Ingest",
            desc: "Ingest raw support tickets & logs.",
            icon: Cloud,
            color: "text-neon-cyan"
        },
        {
            id: 2,
            title: "Process",
            desc: "Classify, Mask PII & Detect Fraud instantly.",
            icon: Brain,
            color: "text-electric-purple"
        },
        {
            id: 3,
            title: "Resolve",
            desc: "Route to the correct Vertical with a draft solution.",
            icon: CheckCircle,
            color: "text-hot-pink"
        }
    ];

    return (
        <section className="relative py-24 px-6 overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-20"
                >
                    <span className="text-xs font-mono text-white/40 tracking-[0.2em] border border-white/10 px-4 py-2 rounded-full uppercase">
                        How Triage Works
                    </span>
                    <h2 className="mt-8 text-4xl md:text-5xl font-display font-medium text-white">
                        From Chaos to <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-electric-purple">Clarity</span>
                    </h2>
                </motion.div>

                <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                    {/* Glowing Connection Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />

                    {steps.map((step, i) => (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.3, duration: 0.6 }}
                            viewport={{ once: true, margin: "-50px" }}
                            className="relative z-10 flex flex-col items-center text-center group"
                        >
                            {/* Icon Card */}
                            <div className="relative w-24 h-24 mb-8 flex items-center justify-center rounded-2xl bg-[#0a0c15] border border-white/10 group-hover:border-white/30 group-hover:bg-[#151820] transition-all duration-500 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br ${step.id === 1 ? 'from-neon-cyan to-transparent' : step.id === 2 ? 'from-electric-purple to-transparent' : 'from-hot-pink to-transparent'}`} />
                                <step.icon size={36} className={`${step.color} transition-transform duration-500 group-hover:scale-110`} />
                                
                                {/* Step Number Badge */}
                                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#1a1d26] border border-white/10 flex items-center justify-center text-xs font-mono text-white/60">
                                    0{step.id}
                                </div>
                            </div>

                            {/* Text Content */}
                            <h3 className="text-xl font-display font-medium text-white mb-3 group-hover:text-neon-cyan transition-colors">
                                {step.title}
                            </h3>
                            <p className="text-white/50 leading-relaxed max-w-[280px]">
                                {step.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TriageProcess;
