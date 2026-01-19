'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import Lenis from 'lenis';

const navItems = [
  { href: '/about', label: 'About', compactWidth: 42 },
  { href: '/design', label: 'Design', compactWidth: 48 },
  { href: '/events', label: 'Events', compactWidth: 46 },
  { href: '/music', label: 'Music', compactWidth: 42 },
  { href: '/art', label: 'Art', compactWidth: 26 },
];

// Fixed dimensions for compact nav
const COMPACT_LOGO_HEIGHT = 32;
const COMPACT_LOGO_MARGIN = 12;
const COMPACT_ITEM_HEIGHT = 24;
const COMPACT_ITEM_GAP = 2;
const HIGHLIGHT_PADDING_X = 10;
const HIGHLIGHT_HEIGHT = 20;

// Expanded nav dimensions
const EXPANDED_ITEM_HEIGHT = 100;
const EXPANDED_ITEM_GAP = 4;

export default function Navigation() {
  const pathname = usePathname();
  const isHomePath = pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [expandedTop, setExpandedTop] = useState(300); // Default fallback

  // Calculate expanded nav position (centered vertically)
  useEffect(() => {
    const calculateExpandedTop = () => {
      const expandedNavHeight = navItems.length * EXPANDED_ITEM_HEIGHT + (navItems.length - 1) * EXPANDED_ITEM_GAP;
      return (window.innerHeight - expandedNavHeight) / 2;
    };

    setExpandedTop(calculateExpandedTop());

    const handleResize = () => {
      setExpandedTop(calculateExpandedTop());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track scroll position on home page
  useEffect(() => {
    if (!isHomePath) {
      setScrolled(false);
      return;
    }

    const handleScroll = () => {
      const threshold = window.innerHeight * 0.3;
      setScrolled(window.scrollY > threshold);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePath]);

  const isCompact = !isHomePath || scrolled;
  const activeIndex = navItems.findIndex(item => item.href === pathname);

  // Calculate the highlight position for compact state based on active index
  const getCompactHighlightTop = () => {
    if (activeIndex === -1) return 0;
    const itemTop = COMPACT_LOGO_HEIGHT + COMPACT_LOGO_MARGIN + (activeIndex * (COMPACT_ITEM_HEIGHT + COMPACT_ITEM_GAP));
    return itemTop + (COMPACT_ITEM_HEIGHT - HIGHLIGHT_HEIGHT) / 2;
  };

  const getCompactHighlightWidth = () => {
    if (activeIndex === -1) return 60;
    return navItems[activeIndex].compactWidth + (HIGHLIGHT_PADDING_X * 2);
  };

  const scrollToTop = useCallback(() => {
    const lenis = (window as unknown as { lenis: Lenis }).lenis;
    if (lenis) {
      lenis.scrollTo(0);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const transitionConfig = {
    duration: 1.1,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  return (
    <motion.nav
      className="fixed z-50"
      initial={false}
      animate={{
        top: isCompact ? 24 : expandedTop,
        left: isCompact ? 24 : 64,
      }}
      transition={transitionConfig}
    >
      {/* Yellow highlight rectangle */}
      <motion.div
        className="absolute bg-[#FBF4B8] -z-10"
        initial={false}
        animate={{
          top: isCompact ? getCompactHighlightTop() : -300,
          left: isCompact ? -HIGHLIGHT_PADDING_X : -64,
          width: isCompact ? getCompactHighlightWidth() : 500,
          height: isCompact ? HIGHLIGHT_HEIGHT : 1200,
          borderRadius: 0,
          opacity: isCompact ? (activeIndex !== -1 ? 1 : 0) : 1,
        }}
        transition={transitionConfig}
      />

      <div className="flex flex-col">
        {/* Logo - only shows when compact */}
        <motion.div
          initial={false}
          animate={{
            opacity: isCompact ? 1 : 0,
            height: isCompact ? COMPACT_LOGO_HEIGHT : 0,
            marginBottom: isCompact ? COMPACT_LOGO_MARGIN : 0,
          }}
          transition={{
            ...transitionConfig,
            delay: isCompact ? 0.2 : 0,
          }}
        >
          {isHomePath ? (
            <button
              onClick={scrollToTop}
              className="hover:opacity-60 transition-opacity duration-300 block"
            >
              <Image
                src="/photos/logo_black.png"
                alt="Dylan Selden"
                width={2027}
                height={1293}
                className="w-auto h-6 md:h-8"
              />
            </button>
          ) : (
            <Link
              href="/"
              className="hover:opacity-60 transition-opacity duration-300 block"
            >
              <Image
                src="/photos/logo_black.png"
                alt="Dylan Selden"
                width={2027}
                height={1293}
                className="w-auto h-6 md:h-8"
              />
            </Link>
          )}
        </motion.div>

        {/* Nav Items */}
        {navItems.map((item, index) => (
          <motion.div
            key={item.href}
            className="flex items-center overflow-hidden"
            initial={false}
            animate={{
              height: isCompact ? COMPACT_ITEM_HEIGHT : EXPANDED_ITEM_HEIGHT,
              marginBottom: isCompact ? COMPACT_ITEM_GAP : EXPANDED_ITEM_GAP,
            }}
            transition={{
              ...transitionConfig,
              delay: index * 0.04,
            }}
          >
            <Link
              href={item.href}
              className="font-[family-name:var(--font-body)] font-bold block hover:opacity-60 transition-opacity duration-300"
            >
              <motion.span
                className="block"
                style={{ willChange: 'font-size, line-height' }}
                initial={false}
                animate={{
                  fontSize: isCompact ? '14px' : '80px',
                  lineHeight: isCompact ? '21px' : '88px',
                }}
                transition={{
                  ...transitionConfig,
                  delay: index * 0.04,
                }}
              >
                {item.label}
              </motion.span>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.nav>
  );
}
