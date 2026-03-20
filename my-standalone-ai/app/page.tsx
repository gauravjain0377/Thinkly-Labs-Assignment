'use client';

import { motion } from 'framer-motion';
import AiChat from '../components/aiChat/AiChat';
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    __openAiChat?: () => void;
  }
}

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-black text-white selection:bg-white/20">
      {/* Background Effects */}
      <div className="bg-noise mix-blend-overlay"></div>

      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="z-10 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto">


        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight pb-2"
        >
          Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500">Gaurav&apos;s AI</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="text-lg md:text-xl text-white/50 mb-12 max-w-2xl font-light leading-relaxed"
        >
          An interactive, intelligent digital brain trained specifically on Gaurav&apos;s experience, projects, and design philosophy.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="mt-6 flex justify-center"
        >
          <motion.button 
            onClick={() => window.__openAiChat?.()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full text-white font-medium text-lg transition-all duration-300 backdrop-blur-md shadow-2xl"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
            <span className="tracking-wide text-white/90 group-hover:text-white transition-colors">Talk to my AI</span>
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              className="w-5 h-5 ml-1 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
        </motion.div>

      </div>

      <AiChat />
    </main>
  );
}
