import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import ParticlesBackground from '../components/ParticlesBackground';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { addToast } = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/auth/register', { name, email, password });
            addToast('Account created! Please login.', 'success');
            navigate('/login');
        } catch (err) {
            addToast(err.response?.data?.message || 'Registration failed', 'error');
        }
    };

    return (
        <div
            className="relative w-full min-h-screen flex justify-center items-center overflow-hidden transition-colors duration-500"
            style={{
                backgroundImage: 'url("https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=2000")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-0"></div>
            <div className="absolute inset-0 z-0">
                <ParticlesBackground />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-[420px] relative z-10 m-5 p-8 md:p-10 rounded-[2.5rem] border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-2xl"
            >
                <div className="text-center mb-10">
                    <motion.div initial={{ y: -10 }} animate={{ y: 0 }} className="mb-6 flex justify-center">
                        <img src="/logo.png" alt="Splits Logo" className="w-20 h-20 object-cover rounded-[1.5rem] shadow-2xl shadow-indigo-500/30 ring-2 ring-indigo-500/20" />
                    </motion.div>
                    <h1 className="text-gradient text-4xl font-black mb-2 tracking-tight">Join Splits</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5">Initiate Operational Status</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-3.5">
                        <label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-300 ml-0.5 opacity-90 block">
                            Name
                        </label>
                        <div className="relative group">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full h-14 md:h-15 px-6 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold transition-all focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none placeholder:text-slate-500 shadow-sm"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-3.5">
                        <label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-300 ml-0.5 opacity-90 block">
                            Email Address
                        </label>
                        <div className="relative group">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-14 md:h-15 px-6 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold transition-all focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 outline-none placeholder:text-slate-500 shadow-sm"
                                placeholder="gateway@proxy.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-3.5">
                        <label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-300 ml-0.5 opacity-90 block">
                            Password
                        </label>
                        <div className="relative group">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-14 md:h-15 px-6 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold transition-all focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none placeholder:text-slate-500 shadow-sm"
                                placeholder="••••••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-400 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -15px rgba(99, 102, 241, 0.5)' }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="w-full py-4 md:py-5 mt-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest shadow-xl transition-all"
                    >
                        <UserPlus size={18} className="text-white" />
                        Register
                    </motion.button>
                </form>

                <p className="mt-8 text-center text-slate-400 text-sm font-semibold">
                    Already an operative? <Link to="/login" className="text-indigo-500 hover:text-purple-400 font-black transition-colors uppercase tracking-wider text-xs ml-1">Login</Link>
                </p>
            </motion.div>
        </div>
    );
};

export default Register;
