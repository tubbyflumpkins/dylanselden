'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useRef, useEffect, useState } from 'react';

export default function HeroImage() {
  const pathname = usePathname();
  const isHome = pathname === '/home2';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scrolledPast, setScrolledPast] = useState(false);
  const scrolledPastRef = useRef(false);

  // Track scroll position to know if hero is out of view
  useEffect(() => {
    const handleScroll = () => {
      const isPast = window.scrollY > window.innerHeight * 0.3;
      setScrolledPast(isPast);
      // Only update ref while on homepage (preserves value after navigation)
      if (isHome) {
        scrolledPastRef.current = isPast;
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHome]);

  // Play video when returning to home page
  useEffect(() => {
    if (isHome && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // Autoplay may be blocked, that's ok
      });
    }
  }, [isHome]);

  // Skip exit animation if user had scrolled past hero when leaving homepage
  const skipExitAnimation = !isHome && scrolledPastRef.current;

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
        duration: skipExitAnimation ? 0 : 0.8,
        ease: [0.32, 0.72, 0, 1],
      }}
      style={{
        pointerEvents: isHome ? 'auto' : 'none',
        // Force instant hide when skipping animation (style overrides animate)
        ...(skipExitAnimation && { opacity: 0, visibility: 'hidden' as const }),
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
