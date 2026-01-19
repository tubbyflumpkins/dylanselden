'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useRef, useEffect } from 'react';

export default function HeroImage() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const videoRef = useRef<HTMLVideoElement>(null);

  // Play video when returning to home page
  useEffect(() => {
    if (isHome && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // Autoplay may be blocked, that's ok
      });
    }
  }, [isHome]);

  return (
    <motion.div
      className="absolute top-0 right-0 w-full md:w-3/5 h-screen bg-[#FAF9F6] z-0 overflow-hidden"
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
      <video
        ref={videoRef}
        src="/videos/hero.mp4"
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      />
    </motion.div>
  );
}
