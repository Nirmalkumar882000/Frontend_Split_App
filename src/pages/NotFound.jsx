import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-cyan-400 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-gray-950 to-gray-950"></div>
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 flex flex-col items-center text-center max-w-lg"
            >
                <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="mb-8 p-4 bg-cyan-950/30 rounded-full border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.2)]"
                >
                    <AlertTriangle className="w-16 h-16 text-cyan-400" />
                </motion.div>
                
                <h1 className="text-7xl font-black mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                    404
                </h1>
                
                <h2 className="text-2xl font-bold mb-6 text-gray-200 tracking-wide uppercase">
                    Connection Lost
                </h2>
                
                <p className="text-gray-400 mb-10 text-lg">
                    The quadrant you are trying to access does not exist in our network. The transmission might be corrupted or the signal has been lost.
                </p>
                
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/')}
                    className="group relative px-8 py-3 bg-transparent border border-cyan-500 rounded-lg overflow-hidden font-bold tracking-wider text-cyan-400 transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer"
                >
                    <div className="absolute inset-0 bg-cyan-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                    <span className="relative flex items-center justify-center gap-2">
                        <Home className="w-5 h-5" />
                        RETURN TO BASE
                    </span>
                </motion.button>
            </motion.div>

            {/* Grid background effect */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#083344_1px,transparent_1px),linear-gradient(to_bottom,#083344_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>
        </div>
    );
};

export default NotFound;
