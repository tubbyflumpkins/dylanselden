'use client';

import { motion } from 'framer-motion';
import ShelfVisualizer from '@/components/ShelfVisualizer';

export default function DesignPage() {
  return (
    <main className="min-h-screen relative z-10 bg-[#FAF9F6]">
      <div className="px-8 md:px-16 lg:px-24 py-24 md:py-32 md:pl-32 lg:pl-40">
        <motion.h1
          className="font-[family-name:var(--font-body)] font-bold text-5xl md:text-6xl lg:text-7xl mb-8 md:mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.32, 0.72, 0, 1] }}
        >
          Design
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl leading-relaxed opacity-70 mb-6 max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.32, 0.72, 0, 1] }}
        >
          Shelf generator. Adjust the parameters to visualize different configurations.
        </motion.p>

        <ShelfVisualizer />
      </div>
    </main>
  );
}
