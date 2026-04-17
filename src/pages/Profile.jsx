import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import { motion } from 'framer-motion';
import { Camera, User, Mail, Save, ArrowLeft, Loader2, Lock, Eye, EyeOff } from 'lucide-react';

const Profile = () => {
    const { user, updateUser } = useAuth();
    const { addToast } = useToast();
    const { isDarkMode } = useTheme();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [image, setImage] = useState(user?.image || '');
    const [isSaving, setIsSaving] = useState(false);
    const location = useLocation();

    useEffect(() => {
        if (location.hash === '#security') {
            const securitySection = document.getElementById('security');
            if (securitySection) {
                securitySection.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [location]);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                addToast('File too large. Please select an image under 2MB', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.src = reader.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 400;
                    const MAX_HEIGHT = 400;
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                    setImage(compressedBase64);
                };
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const { data } = await api.put('/auth/profile', { name, email, image });
            const result = data.result || {};
            updateUser(result);
            addToast('Profile updated successfully!', 'success');
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to update profile', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            addToast('New passwords do not match', 'error');
            return;
        }
        setIsChangingPassword(true);
        try {
            await api.post('/auth/change-password', { currentPassword, newPassword });
            addToast('Password changed successfully!', 'success');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to change password', 'error');
        } finally {
            setIsChangingPassword(false);
        }
    };

    return (
        <div className="min-vh-100 bg-slate-50 dark:bg-[#020617] transition-colors duration-500">
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                <div className="flex justify-between items-center mb-10">
                    <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-[var(--text-muted)] hover:text-indigo-500 hover:shadow-2xl transition-all group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-black uppercase tracking-widest">Return</span>
                    </motion.button>

                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Settings Verified</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-4 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card glow-indigo p-10 text-center relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                            <div className="relative inline-block mb-8">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="w-36 h-36 rounded-[3rem] bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 overflow-hidden shadow-2xl relative group"
                                >
                                    {image ? (
                                        <img src={image} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                            <User size={56} className="text-white opacity-80" />
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current.click()}
                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center text-white backdrop-blur-sm"
                                    >
                                        <Camera size={28} />
                                    </button>
                                </motion.div>
                                <div className="absolute -bottom-1 -right-1 w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl border-4 border-white dark:border-[#0f172a]">
                                    <Camera size={18} />
                                </div>
                            </div>

                            <h2 className="text-2xl font-black text-[var(--text-main)] truncate px-2">{name || 'User'}</h2>
                            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2 opacity-60">Verified Member</p>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </motion.div>
                    </div>

                    <div className="lg:col-span-8 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card glow-indigo p-8 md:p-10 relative overflow-hidden"
                        >
                            <div className="flex items-center gap-4 mb-10">
                                <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-[var(--text-main)] leading-none">Identity</h2>
                                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1.5 opacity-60">Personal Briefing</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3.5">
                                        <label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-200 ml-0.5 opacity-90 block">
                                            Name
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full h-15 px-6 rounded-2xl bg-slate-950/60 dark:bg-slate-950/70 border border-slate-200/10 dark:border-white/5 text-[var(--text-main)] font-semibold transition-all focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none placeholder:text-slate-600"
                                                placeholder="Nirmal Kumar"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3.5">
                                        <label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-200 ml-0.5 opacity-90 block">
                                            Email Address
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full h-15 px-6 rounded-2xl bg-slate-950/60 dark:bg-slate-950/70 border border-slate-200/10 dark:border-white/5 text-[var(--text-main)] font-semibold transition-all focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 outline-none placeholder:text-slate-600"
                                                placeholder="gateway@proxy.com"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={isSaving}
                                    type="submit"
                                    className="btn btn-primary w-full py-5 flex items-center justify-center gap-3 text-lg font-black uppercase tracking-widest shadow-[0_20px_40px_-15px_rgba(99,102,241,0.5)]"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                    {isSaving ? 'Syncing...' : 'Update Records'}
                                </motion.button>
                            </form>
                        </motion.div>

                        <motion.div
                            id="security"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="glass-card glow-purple p-8 md:p-10 relative overflow-hidden scroll-mt-12 bg-slate-50 dark:bg-slate-900/40"
                        >
                            <div className="flex items-center gap-4 mb-10">
                                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
                                    <Lock size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-[var(--text-main)] leading-none">Security Encryption</h2>
                                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1.5 opacity-60">Access Control</p>
                                </div>
                            </div>

                            <form onSubmit={handlePasswordChange} className="space-y-8">
                                <div className="space-y-3.5">
                                    <label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-200 ml-0.5 opacity-90 block">
                                        Current Validation Key
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type={showCurrentPassword ? "text" : "password"}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full h-15 px-6 rounded-2xl bg-slate-950/60 dark:bg-slate-950/70 border border-slate-200/10 dark:border-white/5 text-[var(--text-main)] font-semibold transition-all focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 outline-none placeholder:text-slate-600"
                                            placeholder="••••••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-purple-400 transition-colors"
                                        >
                                            {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3.5">
                                        <label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-200 ml-0.5 opacity-90 block">
                                            New Access Key
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type={showNewPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full h-15 px-6 rounded-2xl bg-slate-950/60 dark:bg-slate-950/70 border border-slate-200/10 dark:border-white/5 text-[var(--text-main)] font-semibold transition-all focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 outline-none placeholder:text-slate-600"
                                                placeholder="••••••••••••"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-purple-400 transition-colors"
                                            >
                                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-3.5">
                                        <label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-200 ml-0.5 opacity-90 block">
                                            Confirm New Key
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full h-15 px-6 rounded-2xl bg-slate-950/60 dark:bg-slate-950/70 border border-slate-200/10 dark:border-white/5 text-[var(--text-main)] font-semibold transition-all focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 outline-none placeholder:text-slate-600"
                                                placeholder="••••••••••••"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-purple-400 transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -15px rgba(168, 85, 247, 0.4)' }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={isChangingPassword}
                                    type="submit"
                                    className="btn w-full py-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest shadow-xl transition-all"
                                >
                                    {isChangingPassword ? <Loader2 className="animate-spin" /> : <Lock size={18} />}
                                    {isChangingPassword ? 'Re-encrypting...' : 'Override Access Key'}
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
