import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, UserPlus, Receipt, ArrowLeft, TrendingUp, DollarSign,
    Wallet, Sun, Moon, MessageSquare, Smile, SendHorizonal, Check, CheckCheck, X
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const COMMON_EMOJIS = ['😊', '😂', '👍', '🔥', '💸', '🍕', '🍻', '🎉', '💰', '🙌', '👀', '✨', '⚡', '🤖', '✅'];

const GroupDetails = () => {
    const { groupId } = useParams();
    const { user } = useAuth();
    const { addToast } = useToast();
    const { isDarkMode, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [balances, setBalances] = useState([]);
    const [settlements, setSettlements] = useState([]);
    const [stats, setStats] = useState({ today: 0, week: 0, month: 0 });

    const [history, setHistory] = useState([]);
    const [totalHistory, setTotalHistory] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [expenseForm, setExpenseForm] = useState({ amount: '', description: '', paidBy: user?.id || '' });
    const [settleForm, setSettleForm] = useState({ payerId: user?.id || '', receiverId: '', amount: '' });
    const [memberEmail, setMemberEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [unreadDelta, setUnreadDelta] = useState(0);

    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [reactingTo, setReactingTo] = useState(null);

    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const chatScrollRef = useRef(null);
    const typingTimerRef = useRef(null);
    const isTypingRef = useRef(false);
    const isAtBottomRef = useRef(true);

    const [showScrollPill, setShowScrollPill] = useState(false);

    const checkIfAtBottom = useCallback(() => {
        const el = chatScrollRef.current;
        if (!el) return;
        const threshold = 80;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
        isAtBottomRef.current = atBottom;
        setShowScrollPill(!atBottom);
    }, []);

    const scrollToBottomInstant = useCallback(() => {
        const el = chatScrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
        isAtBottomRef.current = true;
        setShowScrollPill(false);
    }, []);

    const scrollToBottomSmoothIfAtBottom = useCallback(() => {
        if (isAtBottomRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setShowScrollPill(false);
        } else {

            setShowScrollPill(true);
        }
    }, []);

    useEffect(() => {
        if (showChat) {

            requestAnimationFrame(() => scrollToBottomInstant());
        }
    }, [showChat, scrollToBottomInstant]);

    useEffect(() => {
        scrollToBottomSmoothIfAtBottom();
    }, [messages.length, scrollToBottomSmoothIfAtBottom]);

    useEffect(() => {
        const s = io(SOCKET_URL, { transports: ['websocket'] });
        socketRef.current = s;

        s.emit('joinGroup', { groupId, userId: user.id, userName: user.name });
        s.emit('joinUserRoom', user.id);

        s.on('loadMessages', (msgs) => setMessages(msgs));

        s.on('message', (msg) => {
            setMessages(prev => [...prev, msg]);
            if (!showChat) setUnreadDelta(prev => prev + 1);
        });

        s.on('userTyping', ({ userName, isTyping }) => {
            setTypingUsers(prev =>
                isTyping
                    ? prev.find(u => u === userName) ? prev : [...prev, userName]
                    : prev.filter(u => u !== userName)
            );
        });

        s.on('onlineUsers', (users) => setOnlineUsers(users));

        s.on('userLeft', ({ userName }) => {
            addToast(`${userName} left the group`, 'info');
        });

        s.on('expenseAdded', () => { fetchData(); fetchHistory(); });
        s.on('memberAdded', () => fetchData());
        s.on('refreshGroups', () => fetchData());

        s.on('reactionUpdate', ({ messageId, emoji, userId: reactorId, userName }) => {
            setMessages(prev =>
                prev.map(m => {
                    if (m._id !== messageId) return m;
                    const reactions = m.reactions || {};
                    const existing = reactions[emoji] || [];
                    const already = existing.find(r => r.userId === reactorId);
                    return {
                        ...m,
                        reactions: {
                            ...reactions,
                            [emoji]: already
                                ? existing.filter(r => r.userId !== reactorId)
                                : [...existing, { userId: reactorId, userName }],
                        },
                    };
                })
            );
        });

        fetchData();

        return () => {
            s.disconnect();
        };
    }, [groupId]);

    useEffect(() => {
        if (showChat) {
            setUnreadDelta(0);
            api.post(`/groups/${groupId}/seen`).catch(() => { });
        }
    }, [showChat, groupId]);

    useEffect(() => {
        fetchHistory();
    }, [groupId, searchTerm, currentPage, itemsPerPage]);

    const fetchData = async () => {
        try {
            const { data: res } = await api.get(`/groups/${groupId}`);
            const summary = res.result || {};
            setData(summary);
            setBalances(summary.balances || []);
            setSettlements(summary.settlements || []);
            setStats(summary.stats || { today: 0, week: 0, month: 0 });
            if (!showChat) setUnreadDelta(summary.unreadCount || 0);
            if ((summary.members || []).length > 0 && !expenseForm.paidBy) {
                setExpenseForm(prev => ({ ...prev, paidBy: user.id }));
            }
        } catch (err) {
            console.error('Error fetching data');
        }
    };

    const fetchHistory = async () => {
        setIsHistoryLoading(true);
        try {
            const { data: res } = await api.get(`/groups/${groupId}/expenses`, {
                params: { search: searchTerm, page: currentPage, limit: itemsPerPage }
            });
            const result = res.result || {};
            setHistory(result.expenses || []);
            setTotalHistory(result.total || 0);
            setTotalPages(result.totalPages || 1);
        } catch (err) {
            console.error('Failed to fetch history');
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/expenses', { ...expenseForm, groupId, amount: parseFloat(expenseForm.amount) });
            addToast('Expense added successfully!', 'success');
            setShowExpenseModal(false);
            setExpenseForm({ amount: '', description: '', paidBy: user?.id || '' });
            fetchData();
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to add expense', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post(`/groups/${groupId}/members`, { email: memberEmail });
            addToast('Member added to group!', 'success');
            setMemberEmail('');
            setShowMemberModal(false);
            fetchData();
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to add member', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRecordPayment = async (e) => {
        if (e) e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/expenses/record-payment', {
                groupId,
                payerId: settleForm.payerId,
                receiverId: settleForm.receiverId,
                amount: parseFloat(settleForm.amount)
            });
            addToast('Payment recorded!', 'success');
            setShowSettleModal(false);
            setSettleForm({ payerId: '', receiverId: '', amount: '' });
            fetchData();
            fetchHistory();
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to record payment', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const quickSettle = (payerId, receiverId, amount) => {
        setSettleForm({ payerId, receiverId, amount });
        setShowSettleModal(true);
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        const trimmed = newMessage.trim();
        if (!trimmed || !socketRef.current) return;
        socketRef.current.emit('chatMessage', {
            groupId,
            senderId: user.id,
            senderName: user.name,
            message: trimmed,
        });
        setNewMessage('');
        setShowEmojiPicker(false);
        stopTyping();
    };

    const emitTyping = () => {
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            socketRef.current?.emit('typing', { groupId, userName: user.name, isTyping: true });
        }
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(stopTyping, 2000);
    };

    const stopTyping = () => {
        if (isTypingRef.current) {
            isTypingRef.current = false;
            socketRef.current?.emit('typing', { groupId, userName: user.name, isTyping: false });
        }
        clearTimeout(typingTimerRef.current);
    };

    const sendReaction = (messageId, emoji) => {
        socketRef.current?.emit('messageReaction', {
            groupId, messageId, emoji, userId: user.id, userName: user.name
        });
        setReactingTo(null);
    };

    const addEmoji = (emoji) => setNewMessage(prev => prev + emoji);

    const onlineCount = onlineUsers.length;

    if (!data) return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-[var(--bg-dark)] z-[9999]">
            <div className="relative w-24 h-24">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border-t-2 border-r-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                />
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-4 rounded-full border-2 border-purple-500/30"
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-8 flex items-center justify-center text-indigo-400"
                >
                    <TrendingUp size={32} className="drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                </motion.div>
            </div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 flex flex-col items-center gap-2">
                <h2 className="text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 uppercase">Syncing Live</h2>
                <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                        <motion.div key={i} animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                            className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    ))}
                </div>
            </motion.div>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            { }
            { }
            <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate('/')}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-[var(--text-muted)] hover:text-indigo-500 hover:shadow-lg transition-all mb-8 group"
            >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-bold">Back to Groups</span>
            </motion.button>

            { }
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8 mb-16 border-b border-slate-200 dark:border-white/10 pb-12">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">
                    <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-gradient leading-none">
                        {data.group.name}
                    </h1>

                    { }
                    <div className="flex -space-x-3 hover:space-x-1 transition-all">
                        {data.members.map((m, i) => {
                            const isOnline = onlineUsers.some(o => o.userId === m.id);
                            return (
                                <div key={m.id} className="relative" style={{ zIndex: 10 - i }} title={`${m.name}${isOnline ? ' (online)' : ''}`}>
                                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-white shadow-xl ring-2 ring-indigo-500/20 transition-transform hover:scale-110 hover:z-20 cursor-help overflow-hidden">
                                        {m.image ? <img src={m.image} alt={m.name} className="w-full h-full object-cover" /> : m.name.charAt(0)}
                                    </div>
                                    {isOnline && (
                                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow" />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    { }
                    {onlineCount > 0 && (
                        <p className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {onlineCount} member{onlineCount > 1 ? 's' : ''} online right now
                        </p>
                    )}
                </motion.div>

                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-900/40 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner backdrop-blur-xl">
                        <motion.button
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={toggleTheme}
                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white transition-all shadow-sm hover:shadow-md"
                        >
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </motion.button>

                        { }
                        <motion.button
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => setShowChat(!showChat)}
                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-indigo-400 transition-all shadow-sm hover:shadow-md relative"
                        >
                            <MessageSquare size={20} />
                            {unreadDelta > 0 && !showChat && (
                                <motion.span
                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 z-10"
                                >
                                    {unreadDelta > 99 ? '99+' : unreadDelta}
                                </motion.span>
                            )}
                        </motion.button>
                    </div>

                    <div className="flex gap-4 flex-1 sm:flex-none">
                        <motion.button
                            whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                            onClick={() => setShowSettleModal(true)}
                            className="h-14 px-6 flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-indigo-500 font-bold transition-all justify-center whitespace-nowrap shadow-sm hover:shadow-md"
                        >
                            <TrendingUp size={20} /> Settle Up
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                            onClick={() => setShowMemberModal(true)}
                            className="h-14 px-6 flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[var(--text-main)] font-bold transition-all justify-center whitespace-nowrap shadow-sm hover:shadow-md"
                        >
                            <UserPlus size={20} /> Add Member
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                            onClick={() => setShowExpenseModal(true)}
                            className="h-14 px-8 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white font-black transition-all shadow-[0_10px_30px_-10px_rgba(79,70,229,0.5)] justify-center whitespace-nowrap"
                        >
                            <Plus size={22} className="stroke-[3]" /> NEW EXPENSE
                        </motion.button>
                    </div>
                </div>
            </header>

            { }
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
                { }
                <div className="lg:col-span-8 space-y-12">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {[
                            { label: 'Today', value: stats.today, color: 'indigo', icon: <TrendingUp /> },
                            { label: 'Weekly', value: stats.week, color: 'emerald', icon: <DollarSign /> },
                            { label: 'Monthly', value: stats.month, color: 'rose', icon: <Wallet /> },
                        ].map((stat, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                key={stat.label}
                                className={`glass-card glow-${stat.color} p-6 border-t-2 border-${stat.color}-500/20 hover:border-${stat.color}-500/50 transition-colors relative overflow-hidden group`}
                            >
                                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity scale-150">{stat.icon}</div>
                                <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-3">{stat.label}</div>
                                <div className="text-3xl font-black tabular-nums tracking-tighter">${stat.value.toFixed(2)}</div>
                            </motion.div>
                        ))}
                    </div>

                    { }
                    <div className="space-y-8">
                        <div className="flex items-center gap-4 px-2">
                            <Receipt size={24} className="text-indigo-400" />
                            <h3 className="text-2xl font-black tracking-tight">Recent Activity</h3>
                        </div>
                        <div className="space-y-4">
                            {(data.expenses || []).slice(0, 3).map((exp) => (
                                <motion.div
                                    key={exp.id}
                                    className="p-5 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-white/5 hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl"
                                >
                                    <div className="flex items-center gap-5 w-full sm:w-auto">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${exp.description.startsWith('Settlement:') ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-50 dark:bg-slate-800 text-indigo-500'}`}>
                                            {exp.description.startsWith('Settlement:') ? <Check size={22} /> : <Receipt size={22} />}
                                        </div>
                                        <div>
                                            <div className={`text-lg font-bold tracking-tight mb-0.5 ${exp.description.startsWith('Settlement:') ? 'text-indigo-400 italic' : 'text-[var(--text-main)]'}`}>{exp.description}</div>
                                            <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs font-medium italic">
                                                <span>{exp.paid_by_name} paid</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                                                <span>{new Date(exp.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`text-2xl font-black tracking-tighter tabular-nums drop-shadow-sm ${exp.description.startsWith('Settlement:') ? 'text-indigo-400' : 'text-[var(--text-main)]'}`}>
                                        ${parseFloat(exp.amount).toFixed(2)}
                                    </div>
                                </motion.div>
                            ))}
                            {(!data.expenses || data.expenses.length === 0) && (
                                <p className="text-center text-[var(--text-muted)] py-4 italic">No recent activity</p>
                            )}
                        </div>
                    </div>
                </div>

                { }
                <div className="lg:col-span-4 space-y-8">
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card glow-indigo p-6 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-white/5 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black flex items-center gap-3">
                                <Wallet className="text-indigo-400" size={18} /> Net Balance
                            </h3>
                            <div className="flex items-center gap-2">
                                <motion.button
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        setSettleForm({ payerId: '', receiverId: '', amount: '' });
                                        setShowSettleModal(true);
                                    }}
                                    className="text-[10px] font-black uppercase tracking-widest text-white bg-indigo-600 px-3 py-1.5 rounded-lg shadow-lg hover:bg-indigo-500 transition-colors"
                                >
                                    Settle Up
                                </motion.button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {balances.map((b) => (
                                <div key={b.user_id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-[var(--border)] flex justify-between items-center group hover:border-indigo-500/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${onlineUsers.some(o => o.userId === b.user_id) ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-[var(--text-main)]">{b.name}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-tight text-[var(--text-muted)]">
                                                {b.balance >= 0 ? 'To receive' : 'Needs to pay'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-xl font-black tabular-nums"
                                        style={{ color: b.balance >= 0 ? 'var(--accent-success)' : 'var(--accent-error)' }}>
                                        {b.balance >= 0 ? `+$${b.balance.toFixed(2)}` : `-$${Math.abs(b.balance).toFixed(2)}`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass-card glow-purple p-6 bg-white dark:bg-slate-900/60 rounded-[30px] border-t-2 border-indigo-500/20 shadow-2xl">
                        <h3 className="text-lg font-black mb-8 flex items-center gap-3">
                            <TrendingUp className="text-purple-400" size={18} /> Debt Breakdown
                        </h3>
                        <div className="space-y-6 relative">
                            {settlements.map((s, i) => (
                                <div key={i} className="flex flex-col items-center gap-3 group">
                                    <div className="w-full flex items-center justify-between px-2">
                                        <div className="flex flex-col items-start">
                                            <span className="text-xs font-black text-[var(--text-main)]">{s.from}</span>
                                            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-tighter italic">Owes Money</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => quickSettle(s.from_id, s.to_id, s.amount)}
                                                className="px-3 py-1 bg-indigo-600 rounded-full text-[11px] font-black shadow-lg text-white mb-1 transition-all hover:bg-indigo-500"
                                            >
                                                ${s.amount}
                                            </motion.button>
                                            <div className="text-indigo-500 group-hover:scale-x-150 transition-transform origin-center text-xs">➔</div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs font-black text-[var(--text-main)]">{s.to}</span>
                                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter italic">To Receive</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent opacity-50" />
                                </div>
                            ))}
                            {settlements.length === 0 && (
                                <div className="py-6 flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <Wallet size={24} />
                                    </div>
                                    <p className="text-center text-[var(--text-muted)] text-sm font-bold italic">All accounts are settled! 🎉</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            { }
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400"><Receipt size={24} /></div>
                        <h2 className="text-3xl font-black tracking-tight">Statement History</h2>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative group flex-1 md:w-72">
                            <input
                                type="text" placeholder="Search records..."
                                className="w-full h-12 pl-11 pr-12 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm font-semibold shadow-sm"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                <Receipt size={18} />
                            </div>
                            <AnimatePresence>
                                {searchTerm && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-500 transition-all"
                                    >
                                        <X size={14} />
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>
                        <select
                            className="h-12 px-3 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 focus:border-indigo-500 outline-none text-sm font-bold cursor-pointer transition-all shadow-sm"
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                        >
                            {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                </div>

                <div className="glass-card p-0 overflow-hidden border border-slate-200 dark:border-white/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-white/5 text-[var(--text-muted)] text-xs font-black uppercase tracking-widest border-b border-[var(--border)]">
                                    <th className="px-8 py-5">Date</th>
                                    <th className="px-8 py-5">Description</th>
                                    <th className="px-8 py-5">Paid By</th>
                                    <th className="px-8 py-5 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)] relative min-h-[200px]">
                                {isHistoryLoading && (
                                    <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center z-20">
                                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}
                                            className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
                                    </div>
                                )}
                                {history.length > 0 ? history.map((exp) => (
                                    <tr key={exp.id} className="hover:bg-indigo-500/5 transition-colors">
                                        <td className="px-8 py-5 text-sm font-medium text-[var(--text-muted)] italic tabular-nums">
                                            {new Date(exp.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                {exp.description.startsWith('Settlement:') && <Check size={14} className="text-indigo-400" />}
                                                <div className={`font-bold ${exp.description.startsWith('Settlement:') ? 'text-indigo-400 italic' : 'text-[var(--text-main)]'}`}>
                                                    {exp.description}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-bold text-indigo-400 border border-indigo-500/10 shadow-sm">
                                                    {exp.paid_by_name?.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-[var(--text-main)] font-bold text-xs">{exp.paid_by_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className={`text-xl font-black tabular-nums ${exp.description.startsWith('Settlement:') ? 'text-indigo-400' : (exp.paid_by === user.id ? 'text-emerald-400' : 'text-rose-400')}`}>
                                                {exp.description.startsWith('Settlement:') ? '' : (exp.paid_by === user.id ? '+' : '-')}${parseFloat(exp.amount).toFixed(2)}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-20 text-center text-[var(--text-muted)] font-medium">
                                            {isHistoryLoading ? 'Updating history...' : 'No matching records found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 pt-4 pb-12">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="h-10 px-6 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[var(--text-main)] font-extrabold text-sm disabled:opacity-30 transition-all shadow-sm hover:shadow-md"
                        >Previous</motion.button>
                        <div className="text-sm font-black text-indigo-400 tabular-nums">Page {currentPage} of {totalPages}</div>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="h-10 px-6 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[var(--text-main)] font-extrabold text-sm disabled:opacity-30 transition-all shadow-sm hover:shadow-md"
                        >Next</motion.button>
                    </div>
                )}
            </motion.div>

            { }
            <AnimatePresence>
                {showChat && (
                    <motion.div
                        initial={{ x: 450, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 450, opacity: 0 }}
                        className="fixed top-0 right-0 bottom-0 w-[420px] bg-white dark:bg-[#0B0F1A] border-l border-slate-200 dark:border-white/10 z-[1000] flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.4)] backdrop-blur-3xl"
                    >
                        { }
                        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                                    <MessageSquare size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black tracking-tight">Group Hub</h3>
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-emerald-400">{onlineCount} live</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                                        <span className="text-indigo-400">{messages.length} msgs</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowChat(false)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-rose-500/10 hover:text-rose-500 transition-all text-slate-400"
                            >
                                <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
                            </button>
                        </div>

                        { }
                        <div
                            ref={chatScrollRef}
                            onScroll={checkIfAtBottom}
                            className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar relative"
                        >
                            { }
                            <AnimatePresence>
                                {showScrollPill && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                        onClick={scrollToBottomInstant}
                                        className="sticky top-2 z-20 mx-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-xl shadow-indigo-600/30 transition-colors"
                                    >
                                        ↓ Jump to latest
                                    </motion.button>
                                )}
                            </AnimatePresence>
                            {messages.length > 0 ? messages.map((msg, i) => {
                                const isMine = msg.sender_id === user.id;
                                return (
                                    <motion.div
                                        initial={{ opacity: 0, x: isMine ? 20 : -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        key={msg._id || i}
                                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                                    >
                                        <div className="flex items-center gap-2 mb-1.5 px-1">
                                            {!isMine && <span className="text-[10px] font-black uppercase text-indigo-400">{msg.sender_name}</span>}
                                            <span className="text-[9px] font-bold text-slate-500">
                                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                            </span>
                                            {isMine && (
                                                <span className="text-slate-500">
                                                    {msg.delivered ? <CheckCheck size={12} className="text-indigo-400" /> : <Check size={12} />}
                                                </span>
                                            )}
                                        </div>

                                        { }
                                        <div
                                            className="relative group"
                                            onDoubleClick={() => setReactingTo(reactingTo === msg._id ? null : msg._id)}
                                        >
                                            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-medium shadow-sm ${isMine ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-white/5 text-[var(--text-main)] rounded-tl-none border border-slate-200 dark:border-white/10'}`}>
                                                {msg.message}
                                            </div>

                                            { }
                                            <AnimatePresence>
                                                {reactingTo === msg._id && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                        className={`absolute ${isMine ? 'right-0' : 'left-0'} -top-10 flex gap-1 bg-white dark:bg-slate-800 rounded-2xl px-3 py-2 shadow-xl border border-slate-200 dark:border-white/10 z-20`}
                                                    >
                                                        {['❤️', '😂', '👍', '🔥', '😮', '😢'].map(emoji => (
                                                            <button key={emoji}
                                                                onClick={() => sendReaction(msg._id, emoji)}
                                                                className="text-lg hover:scale-125 transition-transform"
                                                            >{emoji}</button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        { }
                                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1 px-1">
                                                {Object.entries(msg.reactions).map(([emoji, reactors]) =>
                                                    reactors.length > 0 && (
                                                        <span key={emoji}
                                                            className="text-xs bg-slate-100 dark:bg-white/10 rounded-full px-2 py-0.5 flex items-center gap-1 border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-indigo-500/20 transition-colors"
                                                            onClick={() => sendReaction(msg._id, emoji)}
                                                        >
                                                            {emoji} <span className="text-[10px] font-black text-slate-500">{reactors.length}</span>
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            }) : (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-400 flex items-center justify-center">
                                        <MessageSquare size={32} />
                                    </div>
                                    <p className="text-sm font-black uppercase tracking-widest italic">Start the conversation...</p>
                                </div>
                            )}

                            { }
                            <AnimatePresence>
                                {typingUsers.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                        className="flex items-center gap-2 text-[var(--text-muted)]"
                                    >
                                        <div className="flex gap-1 bg-slate-100 dark:bg-white/5 rounded-full px-4 py-2.5 border border-slate-200 dark:border-white/10">
                                            {[0, 1, 2].map(i => (
                                                <motion.div key={i}
                                                    animate={{ y: [0, -4, 0] }}
                                                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                                                    className="w-2 h-2 rounded-full bg-indigo-500"
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500">
                                            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            { }
                            <div ref={messagesEndRef} />
                        </div>

                        { }
                        <AnimatePresence>
                            {showEmojiPicker && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="px-6 py-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-white/10 flex flex-wrap gap-2 justify-center"
                                >
                                    {COMMON_EMOJIS.map(emoji => (
                                        <motion.button whileHover={{ scale: 1.2, y: -2 }} whileTap={{ scale: 0.9 }}
                                            key={emoji} onClick={() => addEmoji(emoji)}
                                            className="text-2xl hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all"
                                        >{emoji}</motion.button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        { }
                        <div className="p-6 bg-slate-50/50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10">
                            <form onSubmit={handleSendMessage} className="relative flex items-center gap-3">
                                <div className="relative flex-1 group">
                                    <textarea
                                        rows="1"
                                        maxLength="500"
                                        className="w-full pl-4 pr-24 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all outline-none text-sm font-medium resize-none max-h-32"
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={(e) => { setNewMessage(e.target.value); emitTyping(); }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage(e);
                                            }
                                        }}
                                        onBlur={stopTyping}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <span className={`text-[9px] font-black tabular-nums transition-colors ${newMessage.length > 450 ? 'text-rose-500' : 'text-slate-500'}`}>
                                            {newMessage.length}/500
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${showEmojiPicker ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                        >
                                            <Smile size={18} />
                                        </button>
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05, x: 3 }} whileTap={{ scale: 0.95 }}
                                    type="submit"
                                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all shrink-0"
                                >
                                    <SendHorizonal size={20} />
                                </motion.button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            { }
            <AnimatePresence>
                {showExpenseModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '1.5rem' }}>
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="glass-card" style={{ width: '100%', maxWidth: '480px', background: 'var(--card-bg)' }}>
                            <h2 style={{ marginBottom: '2rem' }}>Add New Expense</h2>
                            <form onSubmit={handleAddExpense}>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Description</label>
                                    <input className="input-field" placeholder="e.g. Weekly Groceries" value={expenseForm.description}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} required />
                                </div>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Amount ($)</label>
                                    <input className="input-field" type="number" step="0.01" placeholder="0.00" value={expenseForm.amount}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required />
                                </div>
                                <div style={{ marginBottom: '2.5rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Who Paid?</label>
                                    <select className="input-field" value={expenseForm.paidBy}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, paidBy: e.target.value })} required>
                                        {data.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                        type="submit" disabled={isSubmitting} className="btn btn-primary"
                                        style={{ flex: 1.5, opacity: isSubmitting ? 0.7 : 1 }}>
                                        {isSubmitting ? 'Recording...' : 'Record Expense'}
                                    </motion.button>
                                    <button type="button" onClick={() => setShowExpenseModal(false)} className="btn"
                                        style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>Cancel</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}

                {showMemberModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '1.5rem' }}>
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="glass-card" style={{ width: '100%', maxWidth: '480px', background: 'var(--card-bg)' }}>
                            <h2 style={{ marginBottom: '1rem' }}>Invite Member</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Enter the email of the person you want to add to this group.</p>
                            <form onSubmit={handleAddMember}>
                                <div style={{ marginBottom: '2.5rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Email Address</label>
                                    <input className="input-field" type="email" placeholder="friend@example.com"
                                        value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} required />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                        type="submit" disabled={isSubmitting} className="btn btn-primary"
                                        style={{ flex: 1.5, opacity: isSubmitting ? 0.7 : 1 }}>
                                        {isSubmitting ? 'Inviting...' : 'Add to Group'}
                                    </motion.button>
                                    <button type="button" onClick={() => setShowMemberModal(false)} className="btn"
                                        style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>Cancel</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
                {showSettleModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '1.5rem' }}>
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="glass-card" style={{ width: '100%', maxWidth: '480px', background: 'var(--card-bg)' }}>
                            <h2 style={{ marginBottom: '1rem' }}>Settle Up Payment</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Record a direct payment between members to balance the books.</p>
                            <form onSubmit={handleRecordPayment}>
                                <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Payer</label>
                                        <select className="input-field" value={settleForm.payerId}
                                            onChange={(e) => setSettleForm({ ...settleForm, payerId: e.target.value })} required>
                                            <option value="">Select Payer</option>
                                            {data.members.map(m => m.id !== settleForm.receiverId && <option key={m.id} value={m.id}>{m.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Receiver</label>
                                        <select className="input-field" value={settleForm.receiverId}
                                            onChange={(e) => setSettleForm({ ...settleForm, receiverId: e.target.value })} required>
                                            <option value="">Select Receiver</option>
                                            {data.members.map(m => m.id !== settleForm.payerId && <option key={m.id} value={m.id}>{m.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '2.5rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Amount Paid</label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', color: 'var(--text-muted)' }}>$</div>
                                        <input className="input-field" style={{ paddingLeft: '2rem' }} type="number" step="0.01" placeholder="0.00"
                                            value={settleForm.amount} onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })} required />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                        type="submit" disabled={isSubmitting} className="btn btn-primary"
                                        style={{ flex: 1.5, opacity: isSubmitting ? 0.7 : 1 }}>
                                        {isSubmitting ? 'Processing...' : 'Record Payment'}
                                    </motion.button>
                                    <button type="button" onClick={() => setShowSettleModal(false)} className="btn"
                                        style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>Cancel</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GroupDetails;
