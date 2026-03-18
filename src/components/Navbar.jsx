import React from 'react';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import MagneticButton from './MagneticButton';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="fixed w-full z-50 top-0 start-0 border-b border-white/5 bg-[#050f28]/70 backdrop-blur-xl transition-all duration-300">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center justify-between h-20">
                    {/* Logo (Left) */}
                    <Link to="/" className="flex-shrink-0 flex items-center gap-3 cursor-pointer group">
                        <div className="relative w-8 h-8 flex items-center justify-center">
                            {/* Animated Logo Rings */}
                            <div className="absolute inset-0 border border-neon-cyan/30 rounded-full animate-[spin_4s_linear_infinite]" />
                            <div className="absolute inset-1 border border-electric-purple/30 rounded-full animate-[spin_6s_linear_infinite_reverse]" />
                            <div className="w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_10px_rgba(0,245,255,0.8)] animate-pulse" />
                        </div>
                        <span className="text-xl font-display font-bold tracking-wide text-white group-hover:text-neon-cyan transition-colors duration-300">
                            TRIAGE
                        </span>
                    </Link>

                    {/* Center Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link 
                            to="/brain-test" 
                            className="text-gray-300 hover:text-white hover:text-neon-cyan transition-colors text-sm font-medium tracking-wide"
                        >
                            The Brain
                        </Link>
                        <Link 
                            to="/analytics" 
                            className="text-gray-300 hover:text-white hover:text-neon-cyan transition-colors text-sm font-medium tracking-wide"
                        >
                            Analytics
                        </Link>
                    </div>

                    {/* Right Actions */}
                    <div className="hidden md:flex items-center gap-6">
                        <button className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
                            Log In
                        </button>

                        <MagneticButton className="relative px-5 py-2 group overflow-hidden rounded-md bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(0,245,255,0.1)]">
                            <span className="relative text-white font-mono text-xs font-bold tracking-wider uppercase group-hover:text-neon-cyan transition-colors">
                                Try Demo
                            </span>
                        </MagneticButton>
                    </div>

                    {/* Mobile menu button */}
                    <div className="-mr-2 flex md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
                        >
                            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="md:hidden bg-midnight-navy border-b border-glass-border overflow-hidden"
                >
                    <div className="px-5 pt-4 pb-6 space-y-2">
                        {['Dashboard', 'Analytics', 'Modules'].map((item) => (
                            <a
                                key={item}
                                href={`#${item.toLowerCase()}`}
                                className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-white/5"
                            >
                                {item}
                            </a>
                        ))}
                        <div className="mt-6 pt-6 border-t border-white/10 flex flex-col gap-4">
                            <button className="text-gray-300 hover:text-white block px-3 py-2 text-base font-medium text-left">
                                Log In
                            </button>
                            <button className="w-full py-3 bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan font-mono text-sm tracking-widest uppercase rounded">
                                Try Live Demo
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </nav>
    );
};

export default Navbar;
