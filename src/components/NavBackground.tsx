'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function NavBackground() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <motion.div
      className="fixed top-0 left-0 h-screen bg-[#F0E6D3] z-0"
      initial={false}
      animate={{
        width: isHome ? '40%' : '0%',
        x: isHome ? 0 : '-100%',
        opacity: isHome ? 1 : 0,
      }}
      transition={{
        duration: 0.8,
        ease: [0.32, 0.72, 0, 1],
      }}
    />
  );
}
