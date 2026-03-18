import React from 'react';
import { motion } from 'framer-motion';
import TriageProcess from './TriageProcess';

const IntroSection = () => {
    return (
        <section className="relative min-h-[50vh] flex flex-col items-center justify-center bg-transparent overflow-hidden py-12">
            {/* Triage Process Flow */}
            <TriageProcess />
        </section>
    );
};

export default IntroSection;
