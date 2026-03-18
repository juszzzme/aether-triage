import React from 'react';
import { motion } from 'framer-motion';

const SectionReveal = ({ children, delay = 0, direction = 'up' }) => {
    const directions = {
        up: { y: 40, x: 0 },
        left: { y: 0, x: -50 },
        right: { y: 0, x: 50 },
        scale: { y: 0, x: 0 },
    };

    const d = directions[direction] || directions.up;

    return (
        <motion.div
            initial={{
                opacity: 0,
                y: d.y,
                x: d.x,
                scale: direction === 'scale' ? 0.92 : 1
            }}
            whileInView={{
                opacity: 1,
                y: 0,
                x: 0,
                scale: 1
            }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{
                duration: 0.7,
                delay,
                ease: [0.22, 1, 0.36, 1]
            }}
        >
            {children}
        </motion.div>
    );
};

export default SectionReveal;
