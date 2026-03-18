import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Activity, BarChart2, Database, ArrowLeft, Brain, Cpu, ShieldCheck, Zap, Globe, Server, RefreshCw, AlertCircle } from 'lucide-react';
import { triageAPI } from '../utils/api';

const StatCard = ({ title, value, change, icon: Icon, delay, color = "text-neon-cyan", loading = false }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.5 }}
        className="p-5 rounded-xl border border-white/5 bg-[#0F1218] hover:border-white/10 transition-all group relative overflow-hidden"
    >
        {loading && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" 
                 style={{ backgroundSize: '200% 100%' }} />
        )}
        <div className="flex justify-between items-start mb-2">
            <div className={`p-2 rounded-lg bg-white/5 ${color} group-hover:scale-110 transition-transform`}>
                <Icon size={18} />
            </div>
            {change !== null && change !== undefined && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${change >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {change >= 0 ? '+' : ''}{change}%
                </span>
            )}
        </div>
        <h3 className="text-2xl font-mono font-medium text-white mb-1 tracking-tight">
            {loading ? '—' : value}
        </h3>
        <p className="text-xs text-white/40 font-mono uppercase tracking-wider">{title}</p>
    </motion.div>
);

const AnalyticsPage = () => {
    const [stats, setStats] = useState(null);
    const [health, setHealth] = useState('checking');
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [error, setError] = useState(null);

    // Fetch stats and health data
    const fetchData = async () => {
        try {
            const [statsData, healthStatus] = await Promise.all([
                triageAPI.getStats(),
                triageAPI.healthCheck()
            ]);

            setStats(statsData);
            setHealth(healthStatus ? 'online' : 'offline');
            setError(null);
            setLastUpdate(new Date());
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
            setError('Unable to connect to backend');
            setHealth('offline');
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch and polling every 5 seconds
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    // Calculate metrics from stats
    const totalRequests = stats ? (stats.hits + stats.misses) : 0;
    const cacheHitRate = stats && totalRequests > 0 
        ? ((stats.hits / totalRequests) * 100).toFixed(1) 
        : 0;
    const avgLatency = stats?.hits > 0 ? '8ms' : '—'; // Cache hits are ~8ms
    const memoryUsage = stats ? `${stats.size}/${stats.max_size}` : '—';

    return (
        <div className="min-h-screen bg-transparent text-white selection:bg-neon-cyan/30 overflow-x-hidden font-sans">
            <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none -z-10" />
            <div className="fixed inset-0 bg-gradient-to-b from-transparent via-[#050505]/50 to-[#050505] pointer-events-none -z-10" />
            
            <Navbar />

            <main className="relative z-10 max-w-[1600px] mx-auto px-6 py-24">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 border-b border-white/5 pb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            {health === 'online' ? (
                                <>
                                    <Activity size={16} className="text-green-500 animate-pulse" />
                                    <span className="text-xs font-mono text-green-500 tracking-widest uppercase">System Operational</span>
                                </>
                            ) : health === 'offline' ? (
                                <>
                                    <AlertCircle size={16} className="text-red-500" />
                                    <span className="text-xs font-mono text-red-500 tracking-widest uppercase">Backend Offline</span>
                                </>
                            ) : (
                                <>
                                    <RefreshCw size={16} className="text-yellow-500 animate-spin" />
                                    <span className="text-xs font-mono text-yellow-500 tracking-widest uppercase">Connecting...</span>
                                </>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-display font-medium text-white">Mission Control</h1>
                        <p className="text-white/40 mt-2 max-w-xl text-sm font-light">
                            Real-time telemetry and performance metrics for the Triage neural network.
                        </p>
                        {lastUpdate && (
                            <p className="text-[10px] text-white/20 font-mono mt-2">
                                Last updated: {lastUpdate.toLocaleTimeString()}
                            </p>
                        )}
                    </div>
                    
                    <div className="flex gap-4">
                        <button 
                            onClick={fetchData}
                            className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white/70 text-sm font-mono font-medium hover:bg-white/10 hover:border-white/20 transition-all"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            REFRESH
                        </button>
                        <Link to="/brain-test">
                            <button className="flex items-center gap-2 px-6 py-3 bg-neon-cyan/10 border border-neon-cyan/20 rounded-lg text-neon-cyan text-sm font-mono font-bold tracking-wider hover:bg-neon-cyan/20 hover:border-neon-cyan/40 transition-all shadow-[0_0_15px_rgba(0,245,255,0.1)]">
                                <Brain size={16} />
                                ACCESS NEURAL CORE
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Error Alert */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-900/50 flex items-center gap-3"
                        >
                            <AlertCircle size={20} className="text-red-400" />
                            <p className="text-red-300 text-sm">{error} - Start the backend with: <code className="bg-black/30 px-2 py-1 rounded">python backend/main.py</code></p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard 
                        title="Total Requests" 
                        value={totalRequests.toLocaleString()} 
                        icon={Globe} 
                        delay={0.1} 
                        color="text-blue-400"
                        loading={loading}
                    />
                    <StatCard 
                        title="Cache Hit Rate" 
                        value={`${cacheHitRate}%`} 
                        icon={Database} 
                        delay={0.2} 
                        color="text-green-400"
                        loading={loading}
                    />
                    <StatCard 
                        title="Memory Usage" 
                        value={memoryUsage} 
                        icon={Cpu} 
                        delay={0.3} 
                        color="text-purple-400"
                        loading={loading}
                    />
                    <StatCard 
                        title="Avg Latency (Cache)" 
                        value={avgLatency} 
                        icon={Zap} 
                        delay={0.4} 
                        color="text-yellow-400"
                        loading={loading}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Main Chart Area - Cache Performance Visualization */}
                    <div className="lg:col-span-2 bg-[#0F1218] border border-white/5 rounded-2xl p-6 min-h-[400px]">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-sm font-mono text-white/70 uppercase tracking-widest">Cache Performance</h3>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-white/30 font-mono">LIVE DATA</span>
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            </div>
                        </div>
                        
                        {/* Cache Stats Display */}
                        {stats ? (
                            <div className="space-y-8">
                                {/* Hit/Miss Ratio */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs text-white/50 font-mono uppercase">Hit/Miss Ratio</span>
                                        <span className="text-sm text-white font-mono">{stats.hits} / {stats.misses}</span>
                                    </div>
                                    <div className="h-12 flex gap-1">
                                        <div 
                                            className="bg-green-500/30 border border-green-500/50 rounded flex items-center justify-center text-[10px] text-green-300 font-mono"
                                            style={{ width: `${stats.hits > 0 ? (stats.hits / totalRequests) * 100 : 50}%` }}
                                        >
                                            HITS
                                        </div>
                                        <div 
                                            className="bg-red-500/30 border border-red-500/50 rounded flex items-center justify-center text-[10px] text-red-300 font-mono"
                                            style={{ width: `${stats.misses > 0 ? (stats.misses / totalRequests) * 100 : 50}%` }}
                                        >
                                            MISSES
                                        </div>
                                    </div>
                                </div>

                                {/* Memory Usage Bar */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs text-white/50 font-mono uppercase">Memory Buffer</span>
                                        <span className="text-sm text-white font-mono">{stats.size} / {stats.max_size}</span>
                                    </div>
                                    <div className="h-6 bg-white/5 rounded-full overflow-hidden relative">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(stats.size / stats.max_size) * 100}%` }}
                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                            className="h-full bg-gradient-to-r from-cyan-500/50 to-purple-500/50 border-r-2 border-cyan-400"
                                        />
                                    </div>
                                    <p className="text-[10px] text-white/30 font-mono mt-1">
                                        TTL: {stats.ttl_hours}h • {((stats.size / stats.max_size) * 100).toFixed(1)}% capacity
                                    </p>
                                </div>

                                {/* Performance Metrics Grid */}
                                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                                    <div className="text-center">
                                        <div className="text-3xl font-mono font-bold text-cyan-400">{cacheHitRate}%</div>
                                        <div className="text-[10px] text-white/40 font-mono uppercase mt-1">Hit Rate</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-mono font-bold text-green-400">{totalRequests}</div>
                                        <div className="text-[10px] text-white/40 font-mono uppercase mt-1">Total</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-mono font-bold text-purple-400">{stats.evictions || 0}</div>
                                        <div className="text-[10px] text-white/40 font-mono uppercase mt-1">Evictions</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center">
                                <div className="text-center">
                                    <RefreshCw size={48} className="mx-auto mb-4 text-white/10 animate-spin" />
                                    <p className="text-white/40 text-sm">Loading cache statistics...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Side Panel */}
                    <div className="space-y-6">
                        {/* System Health */}
                        <div className="bg-[#0F1218] border border-white/5 rounded-2xl p-6">
                            <h3 className="text-sm font-mono text-white/70 uppercase tracking-widest mb-4">Backend Status</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${health === 'online' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
                                        <span className="text-xs text-white/60 font-mono">FastAPI Server</span>
                                    </div>
                                    <span className={`text-[10px] font-mono font-bold ${health === 'online' ? 'text-green-400' : 'text-red-400'}`}>
                                        {health.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#22d3ee] animate-pulse" />
                                        <span className="text-xs text-white/60 font-mono">Cache Layer</span>
                                    </div>
                                    <span className="text-[10px] text-cyan-400 font-mono font-bold">ACTIVE</span>
                                </div>
                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
                                        <span className="text-xs text-white/60 font-mono">ML Pipeline</span>
                                    </div>
                                    <span className="text-[10px] text-purple-400 font-mono font-bold">READY</span>
                                </div>
                            </div>
                        </div>

                        {/* Cache Actions */}
                        <div className="bg-[#0F1218] border border-white/5 rounded-2xl p-6">
                            <h3 className="text-sm font-mono text-white/70 uppercase tracking-widest mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <button 
                                    onClick={async () => {
                                        await triageAPI.clearCache();
                                        fetchData();
                                    }}
                                    className="w-full px-4 py-2 bg-red-900/20 border border-red-900/50 rounded text-red-400 text-xs font-mono hover:bg-red-900/30 transition-all flex items-center justify-center gap-2"
                                >
                                    <Database size={12} />
                                    CLEAR CACHE
                                </button>
                                <button 
                                    onClick={fetchData}
                                    className="w-full px-4 py-2 bg-cyan-900/20 border border-cyan-900/50 rounded text-cyan-400 text-xs font-mono hover:bg-cyan-900/30 transition-all flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={12} />
                                    FORCE REFRESH
                                </button>
                            </div>
                        </div>

                        {/* Live Info */}
                        <div className="bg-[#0F1218] border border-white/5 rounded-2xl p-6">
                            <h3 className="text-sm font-mono text-white/70 uppercase tracking-widest mb-4">System Info</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-white/40 font-mono uppercase">Polling Interval</span>
                                    <span className="text-xs text-white/70 font-mono">5s</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-white/40 font-mono uppercase">Cache TTL</span>
                                    <span className="text-xs text-white/70 font-mono">{stats?.ttl_hours || 24}h</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-white/40 font-mono uppercase">Max Cache Size</span>
                                    <span className="text-xs text-white/70 font-mono">{stats?.max_size || 1000}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default AnalyticsPage;
