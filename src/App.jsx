import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import CinematicEngine from './components/CinematicEngine';
import PageTransition from './components/PageTransition';

// ✅ CODE SPLITTING: Lazy load pages to reduce initial bundle size
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const BrainTestPage = lazy(() => import('./pages/BrainTestPage'));

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={
        <div className="h-screen bg-[#010204] text-cyan-400 flex items-center justify-center text-xl font-light">
          <div className="animate-pulse">Loading Aether...</div>
        </div>
      }>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
          <Route path="/analytics" element={<PageTransition><AnalyticsPage /></PageTransition>} />
          <Route path="/brain-test" element={<PageTransition><BrainTestPage /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

function App() {
  return (
    <BrowserRouter>
      <CinematicEngine />
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

export default App;
