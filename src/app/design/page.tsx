'use client';

import { motion } from 'framer-motion';
import ShelfVisualizer from '@/components/ShelfVisualizer';
import CornerShelfVisualizer from '@/components/CornerShelfVisualizer';

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

        {/* Horizontal Divider */}
        <motion.hr
          className="my-16 md:my-24 border-t border-[#2C2C2C]/20"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.7, ease: [0.32, 0.72, 0, 1] }}
        />

        <motion.h2
          className="font-[family-name:var(--font-body)] font-bold text-3xl md:text-4xl lg:text-5xl mb-6 md:mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: [0.32, 0.72, 0, 1] }}
        >
          Corner Shelf Generator
        </motion.h2>

        <motion.p
          className="text-lg md:text-xl leading-relaxed opacity-70 mb-6 max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9, ease: [0.32, 0.72, 0, 1] }}
        >
          Corner shelf generator. Creates shelves designed to fit into a 90-degree corner.
        </motion.p>

        <CornerShelfVisualizer />
      </div>
    </main>
  );
}
