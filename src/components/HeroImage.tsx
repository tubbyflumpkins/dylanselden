'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function HeroImage() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <motion.div
      className="fixed top-0 right-0 w-full md:w-3/5 h-screen bg-[#E8E6E1] z-0"
      initial={false}
      animate={{
        opacity: isHome ? 1 : 0,
        scale: isHome ? 1 : 0.95,
        x: isHome ? 0 : 100,
      }}
      transition={{
        duration: 0.8,
        ease: [0.32, 0.72, 0, 1],
      }}
      style={{
        pointerEvents: isHome ? 'auto' : 'none',
      }}
    >
      <Image
        src="/photos/home_page_hero.jpg"
        alt="Dylan Selden"
        fill
        className="object-cover"
        priority
        sizes="(max-width: 768px) 100vw, 60vw"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <p className="text-[#2C2C2C]/20 text-lg font-[family-name:var(--font-body)]">
          Add your photo to /public/photos/home_page_hero.jpg
        </p>
      </div>
    </motion.div>
  );
}
