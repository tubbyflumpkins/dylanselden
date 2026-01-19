'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import Lenis from 'lenis';

const navItems = [
  { href: '/about', label: 'About' },
  { href: '/design', label: 'Design' },
  { href: '/events', label: 'Events' },
  { href: '/music', label: 'Music' },
  { href: '/art', label: 'Art' },
];

export default function Navigation() {
  const pathname = usePathname();
  const isHomePath = pathname === '/';
  const [scrolled, setScrolled] = useState(false);

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

    handleScroll(); // Check initial position
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePath]);

  // Nav should be compact if: not on home OR scrolled down on home
  const isCompact = !isHomePath || scrolled;

  const scrollToTop = useCallback(() => {
    const lenis = (window as unknown as { lenis: Lenis }).lenis;
    if (lenis) {
      lenis.scrollTo(0);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  return (
    <motion.nav
      className="fixed z-50"
      initial={false}
      animate={{
        top: isCompact ? 24 : '50%',
        left: isCompact ? 24 : 64,
        y: isCompact ? 0 : '-50%',
      }}
      transition={{
        duration: 0.8,
        ease: [0.32, 0.72, 0, 1],
      }}
      style={{
        // Set initial position to avoid flash
        top: isCompact ? 24 : '50%',
        left: isCompact ? 24 : 64,
      }}
    >
      <motion.div
        layout
        className="flex flex-col"
        transition={{
          duration: 0.8,
          ease: [0.32, 0.72, 0, 1],
        }}
      >
        {/* Logo - only shows when compact */}
        <motion.div
          initial={false}
          animate={{
            opacity: isCompact ? 1 : 0,
            height: isCompact ? 'auto' : 0,
            marginBottom: isCompact ? 12 : 0,
          }}
          transition={{
            duration: 0.6,
            ease: [0.32, 0.72, 0, 1],
            delay: isCompact ? 0.3 : 0,
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
            layout
            layoutId={`nav-${item.href}`}
            transition={{
              layout: {
                duration: 0.8,
                ease: [0.32, 0.72, 0, 1],
              },
            }}
          >
            <Link
              href={item.href}
              className={`
                font-[family-name:var(--font-body)] font-bold
                block
                hover:opacity-60 transition-opacity duration-300
                ${pathname === item.href ? 'opacity-60' : 'opacity-100'}
              `}
            >
              <motion.span
                layout
                className="block"
                initial={false}
                animate={{
                  fontSize: isCompact ? 'clamp(0.875rem, 1vw, 1rem)' : 'clamp(3rem, 8vw, 8rem)',
                  lineHeight: isCompact ? 1.5 : 1.1,
                  marginBottom: isCompact ? '0.125rem' : '0.25rem',
                }}
                transition={{
                  duration: 0.8,
                  ease: [0.32, 0.72, 0, 1],
                  delay: index * 0.03,
                }}
              >
                {item.label}
              </motion.span>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </motion.nav>
  );
}
