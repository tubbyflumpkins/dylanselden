'use client';

import { motion } from 'framer-motion';

interface PageContentProps {
  title: string;
  children?: React.ReactNode;
}

export default function PageContent({ title, children }: PageContentProps) {
  return (
    <main className="min-h-screen relative z-10 bg-[#FAF9F6]">
      <div className="min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16 md:py-24 md:pl-32 lg:pl-40">
        <motion.h1
          className="font-[family-name:var(--font-body)] font-bold text-5xl md:text-6xl lg:text-7xl mb-8 md:mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.5,
            ease: [0.32, 0.72, 0, 1],
          }}
        >
          {title}
        </motion.h1>
        <motion.div
          className="max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.6,
            ease: [0.32, 0.72, 0, 1],
          }}
        >
          {children || (
            <p className="text-lg md:text-xl leading-relaxed opacity-70">
              Content coming soon.
            </p>
          )}
        </motion.div>
      </div>
    </main>
  );
}
