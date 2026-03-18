import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import MagneticButton from '../components/MagneticButton';
import { Play, ShieldCheck, Activity, Eye, EyeOff, Brain, AlertTriangle, CheckCircle, Zap, Target, TrendingUp, Shield } from 'lucide-react';
import { triageAPI } from '../utils/api';

const BrainTestPage = () => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [revealedPII, setRevealedPII] = useState({});
    const [error, setError] = useState(null);
    const [samplesTrayOpen, setSamplesTrayOpen] = useState(false);

    const handleAnalyze = async () => {
        if (!input.trim()) return;
        
        setLoading(true);
        setResult(null);
        setError(null);
        
        try {
            const backendResponse = await triageAPI.analyze(input);
            
            const mappedResult = {
                category: mapVerticalToCategory(backendResponse.vertical, backendResponse.intent),
                confidence: Math.round((backendResponse.vertical_confidence || 0.5) * 100),
                sentiment_score: 0.5,
                pii_detected: (backendResponse.pii_entities || []).map(entity => ({
                    type: formatPIIType(entity.type),
                    value: entity.masked || entity.value || '[REDACTED]'
                })),
                routing: backendResponse.suggested_actions?.[0]?.label || 
                         `${backendResponse.urgency?.toUpperCase() || 'STANDARD'} PRIORITY`,
                masked_text: backendResponse.masked_text,
                intent: backendResponse.intent,
                vertical: backendResponse.vertical,
                risk_level: backendResponse.risk_level,
                urgency: backendResponse.urgency,
                draft_response: backendResponse.draft_response,
                suggested_actions: backendResponse.suggested_actions || [],
                extracted_entities: backendResponse.extracted_entities || {},
                timestamp: new Date().toLocaleTimeString()
            };
            
            setResult(mappedResult);
            
        } catch (err) {
            console.error('Analysis failed:', err);
            setError(err.message || 'Failed to analyze text. Please check if the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const mapVerticalToCategory = (vertical, intent) => {
        const fraudIntents = ['Fraud_Report', 'Unauthorized_Transaction', 'Account_Compromise'];
        const urgentIntents = ['Urgent_Request', 'Immediate_Action', 'Card_Block'];
        
        if (fraudIntents.includes(intent) || vertical === 'FRAUD') {
            return "CRITICAL THREAT";
        } else if (urgentIntents.includes(intent)) {
            return "HIGH PRIORITY";
        } else if (vertical === 'PAYMENTS' && intent.includes('Failed')) {
            return "PAYMENT ISSUE";
        } else {
            return vertical || "GENERAL INQUIRY";
        }
    };

    const formatPIIType = (type) => {
        const typeMap = {
            'PHONE': 'Phone Number',
            'EMAIL': 'Email Address',
            'CREDIT_CARD': 'Credit Card',
            'ACCOUNT_NUMBER': 'Account Number',
            'AADHAAR': 'Aadhaar Card',
            'PAN': 'PAN Card',
            'NAME': 'Personal Name',
            'ADDRESS': 'Address'
        };
        return typeMap[type] || type;
    };

    const togglePII = (index) => {
        setRevealedPII(prev => ({ ...prev, [index]: !prev[index] }));
    };

    return (
        <div className="min-h-screen bg-transparent text-white selection:bg-neon-cyan/30 overflow-x-hidden font-body">
            {/* FOCUS MODE OVERLAY - 60% opacity blackout shield */}
            <div className="fixed inset-0 bg-[#020305] opacity-60 pointer-events-none z-[1]" />
            
            {/* Background grid (low visibility) */}
            <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-50 z-[1]" />
            
            <Navbar />
            
            <main className="relative z-10 max-w-[1800px] mx-auto px-6 pt-28 pb-12">
                
                {/* TACTICAL HEADER */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex items-center justify-between mb-8 pb-6 border-b border-white/5"
                >
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                            <span className="text-[10px] font-mono text-green-400 tracking-[0.15em] uppercase font-semibold">LIVE STREAM ACTIVE</span>
                        </div>
                        <h1 className="text-3xl font-display font-bold text-white tracking-tight">
                            NEURAL INTELLIGENCE DECK
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-[10px] text-white/30 font-mono tracking-[0.15em] uppercase mb-1">TRIAGE BRAIN</div>
                            <div className="text-xs text-white/60 font-mono">v1.0.0 PRODUCTION</div>
                        </div>
                        <div className="w-12 h-12 rounded-lg border border-cyan-500/30 bg-cyan-500/5 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                            <Brain className="text-cyan-400" size={24} />
                        </div>
                    </div>
                </motion.div>

                {/* DUAL-PANE SYSTEM: 35% Left Input | 65% Right Intelligence */}
                <div className="flex gap-6 items-stretch">
                
                {/* ═══════════════════════════════════════════════════════════════
                    LEFT PANE (35%): INPUT ANALYSIS MONOLITH
                ═══════════════════════════════════════════════════════════════ */}
                <motion.div 
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-[35%] space-y-4"
                >
                    {/* MONOLITH INPUT BOX */}
                    <div className="relative bg-[#0D1117] opacity-95 border border-white/10 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                        {/* Top accent line */}
                        <div className="h-[1px] w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500" />
                        
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-mono text-white/70 tracking-[0.15em] uppercase font-bold">INPUT STREAM</h3>
                                <div className="flex items-center gap-2 text-[10px] text-white/30 font-mono">
                                    <Activity size={10} />
                                    {input.length} CHAR
                                </div>
                            </div>

                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="INJECT RAW DATA STREAM..."
                                className="w-full h-[500px] bg-black border border-white/10 rounded-lg p-4 text-white text-sm font-mono leading-relaxed resize-none focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-white/20"
                            />

                            {/* TACTICAL PRIMARY BUTTON */}
                            <MagneticButton 
                                onClick={handleAnalyze}
                                disabled={loading || !input}
                                className={`mt-4 w-full py-4 rounded-lg font-mono text-sm font-bold tracking-[0.2em] uppercase transition-all duration-300 border flex items-center justify-center gap-3 relative overflow-hidden
                                    ${loading || !input
                                        ? 'bg-white/5 text-white/30 cursor-not-allowed border-white/5' 
                                        : 'bg-gradient-to-r from-cyan-600 to-cyan-700 border-cyan-400 text-white hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-[1.02]'}
                                `}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-cyan-400 rounded-full animate-spin" />
                                        <span>PROCESSING...</span>
                                    </>
                                ) : (
                                    <>
                                        <Play size={16} className="fill-current" />
                                        <span>ANALYZE</span>
                                    </>
                                )}
                                {!loading && input && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" 
                                         style={{ backgroundSize: '200% 100%' }} />
                                )}
                            </MagneticButton>
                        </div>
                    </div>

                    {/* COLLAPSIBLE SAMPLES TRAY */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-[#0D1117] opacity-95 border border-white/5 rounded-lg overflow-hidden"
                    >
                        <button
                            onClick={() => setSamplesTrayOpen(!samplesTrayOpen)}
                            className="w-full p-4 flex items-center justify-between text-[10px] font-mono text-white/50 tracking-[0.15em] uppercase hover:bg-white/5 transition-all"
                        >
                            <span>QUICK TEST SAMPLES</span>
                            <motion.div
                                animate={{ rotate: samplesTrayOpen ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                ▼
                            </motion.div>
                        </button>
                        <AnimatePresence>
                            {samplesTrayOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="border-t border-white/5"
                                >
                                    <div className="p-4 space-y-2">
                                        {[
                                            { label: "Payment Failure", text: "My UPI payment of Rs 500 failed. Contact: 9876543210" },
                                            { label: "Fraud Alert", text: "Unauthorized transaction on my card 4532. Someone hacked my account." },
                                            { label: "Hinglish Query", text: "Mera loan EMI kat gaya lekin paisa nahi mila" }
                                        ].map((sample, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setInput(sample.text)}
                                                className="w-full text-left p-3 rounded bg-white/[0.02] border border-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all group"
                                            >
                                                <div className="text-[9px] text-cyan-400/70 font-mono mb-1 tracking-wider">{sample.label}</div>
                                                <div className="text-[10px] text-white/30 font-mono leading-tight">{sample.text}</div>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* ERROR ALERT */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="p-4 rounded-lg bg-[#0D1117] opacity-95 border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                            >
                                <div className="flex items-start gap-3">
                                    <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <h4 className="text-red-400 font-mono text-[10px] tracking-[0.15em] uppercase mb-2">CONNECTION FAILED</h4>
                                        <p className="text-red-300/80 text-xs leading-relaxed mb-3">{error}</p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleAnalyze()}
                                                className="text-[10px] text-red-300 hover:text-red-100 underline font-mono uppercase tracking-wider"
                                            >
                                                RETRY
                                            </button>
                                            <button
                                                onClick={() => setError(null)}
                                                className="text-[10px] text-red-400/60 hover:text-red-300 font-mono uppercase tracking-wider"
                                            >
                                                DISMISS
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* ═══════════════════════════════════════════════════════════════
                    RIGHT PANE (65%): THE INTELLIGENCE DECK
                ═══════════════════════════════════════════════════════════════ */}
                <motion.div 
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                    className="w-[65%]"
                >
                    <AnimatePresence mode="wait">
                        {result ? (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-4"
                            >
                                {/* ═══════════════════════════════════════════════════
                                    THE QUAD-ANALYSIS GRID
                                ═══════════════════════════════════════════════════ */}
                                <div className="grid grid-cols-2 gap-4">
                                    
                                    {/* TOP LEFT: CLASSIFICATION (Vertical & Intent) */}
                                    <div className="bg-[#0D1117] opacity-95 border border-cyan-500/30 rounded-xl p-5 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Target size={14} className="text-cyan-400" />
                                            <h3 className="text-[10px] font-mono text-white/70 tracking-[0.15em] uppercase font-bold">CLASSIFICATION</h3>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            {/* Vertical */}
                                            <div>
                                                <div className="text-[10px] text-white/40 font-mono tracking-widest uppercase mb-1">Vertical</div>
                                                <div className="inline-block px-3 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/50">
                                                    <span className="text-lg font-mono font-bold text-cyan-300">{result.vertical}</span>
                                                </div>
                                            </div>
                                            
                                            {/* Intent */}
                                            <div>
                                                <div className="text-[10px] text-white/40 font-mono tracking-widest uppercase mb-1">Intent</div>
                                                <div className="text-sm font-mono text-purple-400">{result.intent}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* TOP RIGHT: RISK & URGENCY (Highest visual weight) */}
                                    <div className={`bg-[#0D1117] opacity-95 rounded-xl p-5 shadow-[0_0_30px_rgba(239,68,68,0.3)] ${
                                        result.risk_level === 'high' 
                                            ? 'border border-red-500 animate-pulse' 
                                            : 'border border-orange-500/30'
                                    }`}>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Shield size={14} className="text-red-400" />
                                            <h3 className="text-[10px] font-mono text-white/70 tracking-[0.15em] uppercase font-bold">RISK ANALYSIS</h3>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Risk Level */}
                                            <div>
                                                <div className="text-[10px] text-white/40 font-mono tracking-widest uppercase mb-2">Risk Level</div>
                                                <div className={`text-[32px] font-mono font-bold leading-none ${
                                                    result.risk_level === 'high' ? 'text-red-400' :
                                                    result.risk_level === 'medium' ? 'text-orange-400' :
                                                    'text-green-400'
                                                } ${result.risk_level === 'high' ? 'text-shadow-red' : ''}`}>
                                                    {result.risk_level?.toUpperCase() || 'LOW'}
                                                </div>
                                            </div>
                                            
                                            {/* Urgency */}
                                            <div>
                                                <div className="text-[10px] text-white/40 font-mono tracking-widest uppercase mb-2">Urgency</div>
                                                <div className={`text-[32px] font-mono font-bold leading-none ${
                                                    result.urgency === 'high' ? 'text-red-400' :
                                                    result.urgency === 'medium' ? 'text-orange-400' :
                                                    'text-green-400'
                                                }`}>
                                                    {result.urgency?.charAt(0).toUpperCase() || 'L'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* BOTTOM LEFT: SENTIMENT & CONFIDENCE GAUGES */}
                                    <div className="bg-[#0D1117] opacity-95 border border-purple-500/30 rounded-xl p-5 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Activity size={14} className="text-purple-400" />
                                            <h3 className="text-[10px] font-mono text-white/70 tracking-[0.15em] uppercase font-bold">CONFIDENCE</h3>
                                        </div>
                                        
                                        {/* Segmented LED-Style Meter */}
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest">AI Certainty</span>
                                                <span className="text-[24px] font-mono font-bold text-white">{result.confidence}%</span>
                                            </div>
                                            
                                            {/* LED Segments */}
                                            <div className="flex gap-1 h-4">
                                                {[...Array(20)].map((_, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`flex-1 rounded-sm transition-all ${
                                                            (i / 20) * 100 < result.confidence
                                                                ? i < 10 ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.8)]' 
                                                                  : i < 15 ? 'bg-cyan-500 shadow-[0_0_4px_rgba(6,182,212,0.8)]'
                                                                  : 'bg-purple-500 shadow-[0_0_4px_rgba(168,85,247,0.8)]'
                                                                : 'bg-white/10'
                                                        }`} 
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* BOTTOM RIGHT: RECOMMENDED ACTIONS */}
                                    <div className="bg-[#0D1117] opacity-95 border border-green-500/30 rounded-xl p-5 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                                        <div className="flex items-center gap-2 mb-4">
                                            <CheckCircle size={14} className="text-green-400" />
                                            <h3 className="text-[10px] font-mono text-white/70 tracking-[0.15em] uppercase font-bold">ACTIONS</h3>
                                        </div>
                                        
                                        {result.suggested_actions && result.suggested_actions.length > 0 ? (
                                            <div className="space-y-2">
                                                {result.suggested_actions.slice(0, 3).map((action, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-xs text-green-300 font-mono">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                                        <span>{action.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-white/30 font-mono">No actions required</div>
                                        )}
                                    </div>
                                </div>

                                {/* ═══════════════════════════════════════════════════
                                    SECONDARY DATA CARDS
                                ═══════════════════════════════════════════════════ */}
                                
                                {/* PII DETECTION */}
                                {result.pii_detected && result.pii_detected.length > 0 && (
                                    <div className="bg-[#0D1117] opacity-95 border border-yellow-500/30 rounded-xl p-5 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                                        <div className="flex items-center gap-2 mb-4">
                                            <ShieldCheck size={14} className="text-yellow-400" />
                                            <h3 className="text-[10px] font-mono text-white/70 tracking-[0.15em] uppercase font-bold">PII ENTITIES DETECTED</h3>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                            {result.pii_detected.map((item, idx) => (
                                                <div 
                                                    key={idx} 
                                                    onClick={() => togglePII(idx)}
                                                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-yellow-500/5 hover:border-yellow-500/20 transition-colors cursor-pointer group"
                                                >
                                                    <span className="text-[10px] text-white/50 font-mono uppercase tracking-wider">{item.type}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs font-mono transition-all duration-300 ${
                                                            revealedPII[idx] ? 'text-yellow-400 blur-none' : 'text-white/10 blur-sm select-none'
                                                        }`}>
                                                            {item.value}
                                                        </span>
                                                        {revealedPII[idx] ? <EyeOff size={10} className="text-white/20" /> : <Eye size={10} className="text-yellow-400/60" />}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* AI DRAFT RESPONSE */}
                                {result.draft_response && (
                                    <div className="bg-[#0D1117] opacity-95 border border-purple-500/30 rounded-xl p-5 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Brain size={14} className="text-purple-400" />
                                            <h3 className="text-[10px] font-mono text-white/70 tracking-[0.15em] uppercase font-bold">AI DRAFT RESPONSE</h3>
                                        </div>
                                        
                                        <div className="p-4 rounded-lg bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/20">
                                            <p className="text-sm text-white/80 leading-relaxed font-mono whitespace-pre-wrap">
                                                {result.draft_response}
                                            </p>
                                        </div>
                                        
                                        {/* REVIEW BUTTON */}
                                        <button className="mt-4 w-full py-3 rounded-lg bg-gradient-to-r from-cyan-600/30 to-cyan-700/30 border border-cyan-400/50 text-cyan-300 font-mono text-xs font-bold tracking-[0.2em] uppercase hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-[1.02] transition-all">
                                            REVIEW MANUALLY
                                        </button>
                                    </div>
                                )}

                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="h-full min-h-[600px] flex flex-col items-center justify-center bg-[#0D1117] opacity-95 border border-white/5 rounded-xl"
                            >
                                <Activity size={64} strokeWidth={1} className={loading ? "animate-pulse text-cyan-500" : "text-white/10"} />
                                <p className="font-mono text-sm tracking-[0.2em] uppercase mt-6 text-white/30">
                                    {loading ? "NEURAL PROCESSING..." : "AWAITING INPUT STREAM"}
                                </p>
                                {loading && (
                                    <div className="mt-4 flex gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <div 
                                                key={i} 
                                                className="w-2 h-2 rounded-full bg-cyan-500/50 animate-pulse"
                                                style={{ animationDelay: `${i * 0.15}s` }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                </div>
            </main>
        </div>
    );
};

export default BrainTestPage;
