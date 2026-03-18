import React from 'react';
import { motion } from 'framer-motion';
import { Brain, ShieldCheck, Zap, Globe } from 'lucide-react';

const features = [
    {
        icon: Brain,
        title: "AI-Powered Classification",
        description: "Instantly categorizes tickets into banking verticals (UPI, Loans, KYC) with 95%+ accuracy."
    },
    {
        icon: ShieldCheck,
        title: "Enterprise-Grade Security",
        description: "Real-time PII masking and fraud detection ensures customer data never leaves the secure perimeter."
    },
    {
        icon: Zap,
        title: "Automated Resolution",
        description: "Generates context-aware responses and routing decisions in <100ms, reducing manual triage by 80%."
    },
    {
        icon: Globe,
        title: "Multi-Language Support",
        description: "Native understanding of regional languages and code-mixed (Hinglish) banking queries."
    }
];

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

const FeaturesGrid = () => {
    return (
        <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto px-6 mt-12"
        >
            {features.map((f, i) => (
                <motion.div
                    key={i}
                    variants={item}
                    className="group relative p-6 rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300"
                >
                    <div className="flex items-start gap-5">
                        <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-neon-cyan group-hover:text-white group-hover:bg-neon-cyan/10 transition-colors">
                            <f.icon size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-display font-medium text-white/90 mb-2">
                                {f.title}
                            </h3>
                            <p className="text-sm text-white/60 leading-relaxed font-light">
                                {f.description}
                            </p>
                        </div>
                    </div>
                </motion.div>
            ))}
        </motion.div>
    );
};

export default FeaturesGrid;
