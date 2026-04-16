import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, LogOut, LayoutDashboard, Sun, Moon, TrendingUp, User, X, ArrowRight, Lock, ChevronDown } from 'lucide-react';
import { io } from 'socket.io-client';
import { useTheme } from '../context/ThemeContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899'];

const Dashboard = () => {
    const [groups, setGroups] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [pieData, setPieData] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const { user, logout } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [totalGroups, setTotalGroups] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showItemsDropdown, setShowItemsDropdown] = useState(false);

    useEffect(() => {
        fetchGroups();
    }, [searchTerm, currentPage, itemsPerPage]);

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            await Promise.all([fetchGroups(), fetchStats()]);
            setIsLoading(false);
        };
        loadInitialData();

        const socket = io('http://localhost:5000');
        if (user?.id) {
            socket.emit('joinUserRoom', user.id);
        }

        socket.on('refreshGroups', () => {
            fetchGroups();
            fetchStats();
        });

        return () => socket.disconnect();
    }, [user?.id]);

    const fetchGroups = async () => {
        try {
            const { data } = await api.get('/groups', {
                params: { search: searchTerm, page: currentPage, limit: itemsPerPage }
            });
            const result = data.result || {};
            setGroups(result.groups || []);
            setTotalGroups(result.total || 0);
            setTotalPages(result.totalPages || 1);
        } catch (err) {
            console.error('Failed to fetch groups');
        }
    };

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/groups/dashboard/stats');
            const result = data.result || {};
            setChartData(result.areaChart || []);
            setPieData(result.pieChart || []);
        } catch (err) {
            console.error('Failed to fetch stats');
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        try {
            await api.post('/groups', { name: newGroupName });
            setNewGroupName('');
            setShowModal(false);
            fetchGroups();
        } catch (err) {
            console.error('Failed to create group');
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    if (isLoading) return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-[var(--bg-dark)] z-[9999]">
            <div className="relative w-24 h-24">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-t-2 border-r-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                />
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-4 rounded-full border-2 border-purple-500/30"
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-8 flex items-center justify-center text-indigo-400"
                >
                    <LayoutDashboard size={32} className="drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                </motion.div>
            </div>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8 flex flex-col items-center gap-2"
            >
                <h2 className="text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 uppercase">
                    Initialising HUD
                </h2>
                <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                        <motion.div
                            key={i}
                            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                            className="w-1.5 h-1.5 rounded-full bg-indigo-500"
                        />
                    ))}
                </div>
            </motion.div>
        </div>
    );

    return (
        <div className="min-h-screen">
            <nav className="sticky top-0 z-[100] w-full bg-[var(--bg-dark)]/80 backdrop-blur-xl border-b border-[var(--border)] mb-8">
                <div className="container mx-auto px-4 max-w-7xl h-20 md:h-24 flex flex-col md:flex-row justify-between items-center gap-4">
                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center gap-4">
                        <img src="/favicon.png" alt="Splits Logo" className="w-10 h-10 object-contain shadow-2xl rounded-2xl ring-1 ring-indigo-500/20 shadow-indigo-500/10" />
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-gradient m-0" style={{ lineHeight: '1' }}>Splits</h1>
                            <p className="text-[var(--text-muted)] text-[10px] uppercase font-black tracking-widest mt-1 opacity-60">Financial Intelligence Hub</p>
                        </div>
                    </motion.div>

                    <div className="flex items-center gap-5">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="hidden lg:flex items-center gap-4 border-r border-slate-200 dark:border-white/10 pr-6 mr-1"
                        >
                            <div className="text-right">
                                <div className="flex items-center justify-end gap-1.5 mb-0.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">System Active</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                                </div>
                                <h3 className="text-sm font-black text-[var(--text-main)] m-0 flex items-center gap-2">
                                    Welcome, <span className="text-indigo-500 uppercase tracking-tighter">{user?.name}</span>
                                </h3>
                            </div>
                        </motion.div>

                        <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/5 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 shadow-inner">
                            <motion.button
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={toggleTheme}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[var(--text-muted)] hover:text-indigo-500 transition-all shadow-sm"
                            >
                                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                            </motion.button>
                        </div>

                        <div className="relative">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                className="relative group cursor-pointer flex items-center"
                            >
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl opacity-75 blur-sm group-hover:opacity-100 transition duration-300"></div>
                                <div className="relative w-11 h-11 rounded-xl bg-slate-900 border-2 border-slate-900 overflow-hidden flex items-center justify-center p-0.5 shadow-2xl">
                                    {user?.image ? (
                                        <img src={user.image} alt="Profile" className="w-full h-full object-cover rounded-lg" />
                                    ) : (
                                        <div className="w-full h-full rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                            <User className="text-white" size={20} />
                                        </div>
                                    )
                                    }
                                </div>
                            </motion.div>

                            <AnimatePresence>
                                {showProfileDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowProfileDropdown(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute right-0 mt-3 w-48 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden"
                                        >
                                            <button
                                                onClick={() => { navigate('/profile'); setShowProfileDropdown(false); }}
                                                className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold text-[var(--text-muted)] hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                            >
                                                <User size={18} /> View Profile
                                            </button>
                                            <button
                                                onClick={() => { navigate('/profile#security'); setShowProfileDropdown(false); }}
                                                className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold text-[var(--text-muted)] hover:text-purple-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                            >
                                                <Lock size={18} /> Change Password
                                            </button>
                                            <div className="h-px bg-slate-100 dark:bg-white/5 mx-2" />
                                            <button
                                                onClick={logout}
                                                className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold text-rose-500 hover:bg-rose-500/10 transition-all"
                                            >
                                                <LogOut size={18} /> Logout
                                            </button>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="container mx-auto px-4 py-4 max-w-7xl">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6 w-full lg:w-auto">
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4">
                            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                                <LayoutDashboard size={24} strokeWidth={2.5} />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black m-0 tracking-tight text-[var(--text-main)] whitespace-nowrap">
                                Your Groups
                            </h2>
                        </motion.div>

                        <div className="flex items-center gap-3 w-full md:w-auto md:min-w-[400px] h-12">
                            <div className="relative group flex-1 h-full">
                                <input
                                    type="text"
                                    placeholder="Search groups..."
                                    className="w-full h-full pl-11 pr-4 rounded-xl bg-white/5 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/10 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm font-bold shadow-sm backdrop-blur-md"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500/70 group-focus-within:text-indigo-400 transition-colors">
                                    <Users size={18} strokeWidth={2.5} />
                                </div>
                                <AnimatePresence>
                                    {searchTerm && (
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                                            onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10 text-slate-400 hover:text-rose-500 transition-all"
                                        >
                                            <X size={14} strokeWidth={3} />
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="relative h-full shrink-0">
                                <motion.div
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowItemsDropdown(!showItemsDropdown)}
                                    className="h-full px-5 pr-10 rounded-xl bg-white/5 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/10 flex items-center justify-center text-sm font-black cursor-pointer transition-all shadow-sm backdrop-blur-md min-w-[80px]"
                                >
                                    {itemsPerPage}
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                                        <motion.div
                                            animate={{ rotate: showItemsDropdown ? 180 : 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <ChevronDown size={16} strokeWidth={3} />
                                        </motion.div>
                                    </div>
                                </motion.div>

                                <AnimatePresence>
                                    {showItemsDropdown && (
                                        <>
                                            <div className="fixed inset-0 z-[100]" onClick={() => setShowItemsDropdown(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute right-0 top-full mt-2 w-full min-w-[80px] py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[101] overflow-hidden backdrop-blur-xl"
                                            >
                                                {[6, 12, 24, 48].map((num) => (
                                                    <button
                                                        key={num}
                                                        onClick={() => { setItemsPerPage(num); setCurrentPage(1); setShowItemsDropdown(false); }}
                                                        className={`w-full px-4 py-2.5 text-sm font-black transition-all text-center ${itemsPerPage === num ? 'bg-indigo-500 text-white' : 'text-[var(--text-muted)] hover:bg-indigo-500/10 hover:text-indigo-500'}`}
                                                    >
                                                        {num}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02, y: -2, boxShadow: '0 20px 40px -15px rgba(99, 102, 241, 0.5)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowModal(true)}
                        className="h-12 px-8 flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white font-black text-sm tracking-tight transition-all shadow-lg w-full lg:w-auto justify-center group shrink-0"
                    >
                        <div className="p-1 rounded-lg bg-white/20 group-hover:bg-white/30 transition-colors">
                            <Plus size={16} strokeWidth={3} />
                        </div>
                        <span className="whitespace-nowrap">Create New Group</span>
                    </motion.button>
                </div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12"
                >
                    {groups.length > 0 ? (
                        groups.map((group) => (
                            <motion.div
                                key={group.id}
                                variants={itemVariants}
                                whileHover={{ y: -8, scale: 1.02 }}
                                className="glass-card glow-indigo cursor-pointer relative overflow-hidden group border border-slate-200 dark:border-white/5"
                                onClick={() => navigate(`/groups/${group.id}`)}
                                style={{ padding: '1.75rem' }}
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                    <ArrowRight className="text-indigo-400" size={20} />
                                </div>

                                <div className="flex items-center gap-5 mb-8">
                                    <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-3.5 rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform relative">
                                        <Users size={24} />
                                        {group.unreadCount > 0 && (
                                            <motion.span
                                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[var(--card-bg)] shadow-md"
                                            >
                                                {group.unreadCount > 99 ? '99+' : group.unreadCount}
                                            </motion.span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="m-0 text-xl font-bold tracking-tight text-[var(--text-main)] truncate">{group.name}</h3>
                                        <p className="text-[var(--text-muted)] text-[11px] mt-1 font-bold uppercase tracking-wider opacity-60">
                                            Joined {new Date(group.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div className="space-y-3">
                                        <div className="flex -space-x-3 overflow-hidden p-1">
                                            {group.members?.slice(0, 5).map((m, i) => (
                                                <div
                                                    key={i}
                                                    title={m.name}
                                                    className="w-8 h-8 rounded-full border-2 border-[var(--card-bg)] bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] text-indigo-500 shadow-md transition-transform hover:scale-110 hover:z-10 cursor-help overflow-hidden"
                                                >
                                                    {m.image ? <img src={m.image} alt={m.name} className="w-full h-full object-cover" /> : m.name?.charAt(0).toUpperCase() || '?'}
                                                </div>
                                            ))}
                                            {group.members?.length > 5 && (
                                                <div className="w-8 h-8 rounded-full border-2 border-[var(--card-bg)] bg-indigo-500 flex items-center justify-center font-bold text-[10px] text-white shadow-md">
                                                    +{group.members.length - 5}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-2 border ${Math.abs(Number(group.balance) || 0) < 0.01 ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' : (Number(group.balance) || 0) > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                            {Math.abs(Number(group.balance) || 0) < 0.01 ? 'Settled' : (Number(group.balance) || 0) > 0 ? 'Receivable' : 'Payable'}
                                        </div>
                                        <div className={`text-2xl font-mono-numbers font-black tracking-tighter ${Math.abs(Number(group.balance) || 0) < 0.01 ? 'text-slate-400' : (Number(group.balance) || 0) > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            <span className="text-sm mr-0.5 opacity-60">₹</span>
                                            {Math.abs(Number(group.balance) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center text-[var(--text-muted)] font-medium bg-white/5 rounded-3xl border border-dashed border-[var(--border)]">
                            No groups found matching "{searchTerm}"
                        </div>
                    )}
                </motion.div>

                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mb-16">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="h-10 px-6 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[var(--text-main)] font-extrabold text-sm disabled:opacity-30 transition-all shadow-sm hover:shadow-md"
                        >
                            Previous
                        </motion.button>
                        <div className="text-sm font-black text-[var(--text-main)] px-4 tabular-nums">
                            Page {currentPage} of {totalPages}
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="h-10 px-6 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[var(--text-main)] font-extrabold text-sm disabled:opacity-30 transition-all shadow-sm hover:shadow-md"
                        >
                            Next
                        </motion.button>
                    </div>
                )}

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12" >
                    <div className="glass-card glow-indigo lg:col-span-2">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-indigo-500/20 text-indigo-400 p-2.5 rounded-xl border border-indigo-500/30">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold m-0 text-[var(--text-main)]">Expense History</h2>
                                <p className="text-[var(--text-muted)] text-sm font-medium">Your spending across all groups this week</p>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}
                                        itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="expenses" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="glass-card glow-purple">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-purple-500/20 text-purple-400 p-2.5 rounded-xl border border-purple-500/30">
                                <LayoutDashboard size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold m-0 text-[var(--text-main)]">Categories</h2>
                                <p className="text-[var(--text-muted)] text-sm font-medium">Expense breakdown</p>
                            </div>
                        </div>
                        <div className="h-[300px] w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="45%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}
                                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {showModal && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '1.5rem' }}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="glass-card" style={{ width: '100%', maxWidth: '450px', background: 'var(--card-bg)' }}
                            >
                                <h2 style={{ marginBottom: '0.5rem' }}>Create New Group</h2>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Give your group a name to get started.</p>
                                <form onSubmit={handleCreateGroup}>
                                    <div style={{ marginBottom: '2rem' }}>
                                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Group Name</label>
                                        <input
                                            className="input-field" placeholder="e.g. Dream House, Summer Trip"
                                            value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                                            autoFocus required
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                            type="submit" className="btn btn-primary" style={{ flex: 1.5 }}
                                        >
                                            Create Group
                                        </motion.button>
                                        <button
                                            type="button" onClick={() => setShowModal(false)} className="btn"
                                            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default Dashboard;
