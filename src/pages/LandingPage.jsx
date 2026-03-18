import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import IntroSection from '../components/IntroSection';
import CalculatorSection from '../components/CalculatorSection';
import StrategiesSection from '../components/StrategiesSection';
import FeaturesSection from '../components/FeaturesSection';
import OrbitBackground from '../components/OrbitBackground';

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-transparent text-cloud-dancer selection:bg-neon-cyan/30 overflow-x-hidden">
            <Navbar />
            <Hero />
            <IntroSection />
            <CalculatorSection />
            <StrategiesSection />
            <FeaturesSection />
        </div>
    );
};

export default LandingPage;
