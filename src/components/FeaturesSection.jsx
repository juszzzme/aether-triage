import React from 'react';
import { motion } from 'framer-motion';
import { IconLanguage, IconRouting, IconScan, IconBot, IconDashboard, IconApi, IconShield, IconTarget } from './Icons';

const features = [
    { icon: <IconLanguage className="w-8 h-8 text-neon-cyan" />, title: 'Hinglish NLP', tag: 'NLP', desc: 'Native code-mixed understanding' },
    { icon: <IconRouting className="w-8 h-8 text-electric-purple" />, title: 'Instant Routing', tag: 'CLASSIFIER', desc: '<100ms vertical classification' },
    { icon: <IconScan className="w-8 h-8 text-hot-pink" />, title: 'OCR Extraction', tag: 'VISION', desc: 'Docs & screenshot analysis' },
    { icon: <IconBot className="w-8 h-8 text-neon-cyan" />, title: 'Auto-Drafts', tag: 'GENERATION', desc: 'Context-aware responses' },
    { icon: <IconDashboard className="w-8 h-8 text-electric-purple" />, title: 'Live Analytics', tag: 'DASHBOARD', desc: 'Real-time SLA tracking' },
    { icon: <IconApi className="w-8 h-8 text-hot-pink" />, title: 'API-First', tag: 'INTEGRATION', desc: 'Seamless CRM connect' },
    { icon: <IconShield className="w-8 h-8 text-neon-cyan" />, title: 'Fraud Guard', tag: 'SECURITY', desc: 'Pattern-based detection' },
    { icon: <IconTarget className="w-8 h-8 text-electric-purple" />, title: 'Precision', tag: 'TRACKING', desc: '99% Accuracy guarantee' },
];

const FeaturesSection = () => {
    return (
        <section className="relative py-32 bg-transparent overflow-hidden border-t border-white/5">
            <div className="mb-16 text-center">
                <span className="text-[0.65rem] font-mono text-neon-cyan/60 tracking-widest border border-neon-cyan/20 px-3 py-1 uppercase">
                    [ &nbsp; Capabilities Stream &nbsp; ]
                </span>
            </div>

            <div className="relative flex overflow-hidden group">
                <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-deep-space to-transparent z-10" />
                <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-deep-space to-transparent z-10" />

                {/* Slower duration: 60s */}
                <div className="flex animate-[marquee_60s_linear_infinite] group-hover:[animation-play-state:paused] gap-8 py-4 pl-4">
                    {[...features, ...features, ...features].map((item, i) => (
                        <div
                            key={i}
                            className="flex-shrink-0 w-[300px] p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer group/card"
                        >
                            <div className="mb-6 p-3 bg-white/5 rounded-lg w-fit group-hover/card:scale-110 transition-transform duration-300">
                                {item.icon}
                            </div>

                            <h3 className="text-white font-display text-xl font-bold mb-2 tracking-wide">{item.title}</h3>
                            <p className="text-cloud-dancer/60 text-sm font-body leading-relaxed mb-4">{item.desc}</p>

                            <span className="text-[10px] font-mono text-neon-cyan/60 tracking-[0.2em] uppercase border-t border-white/5 pt-3 block">
                                {item.tag}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
        </section>
    );
};

export default FeaturesSection;
