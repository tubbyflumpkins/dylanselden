'use client';

import { motion } from 'framer-motion';
import HighlightedText from '@/components/HighlightedText';

export default function IntroSection() {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-50px' },
    transition: { duration: 0.6, ease: [0.32, 0.72, 0, 1] },
  };

  return (
    <section className="px-8 md:px-16 lg:px-24 pt-16 pb-0 md:pt-24 md:pb-0 bg-[#FAF9F6] relative z-10">
      <div className="max-w-4xl space-y-3">
        <motion.p
          className="text-lg md:text-xl leading-relaxed opacity-80"
          {...fadeIn}
        >
          <HighlightedText>Hi, I'm /Dylan Selden/.</HighlightedText>
        </motion.p>
        <motion.p
          className="text-lg md:text-xl leading-relaxed opacity-80"
          {...fadeIn}
        >
          <HighlightedText>I'm a Los Angeles–based designer and builder. /I make systems/ that generate designs, then I build them.</HighlightedText>
        </motion.p>
        <motion.p
          className="text-lg md:text-xl leading-relaxed opacity-80"
          {...fadeIn}
        >
          <HighlightedText>I'm the co-founder of /Squarage/, where I lead design and fabrication, build production pipelines, and handle everything from marketing to web.</HighlightedText>
        </motion.p>
        <motion.p
          className="text-lg md:text-xl leading-relaxed opacity-80"
          {...fadeIn}
        >
          This site is a selection of what I've been building lately.
        </motion.p>
        <motion.p
          className="text-lg md:text-xl leading-relaxed opacity-80"
          {...fadeIn}
        >
          I love weird problems and building spaces. <a href="mailto:dylan@squarage.com" className="underline hover:opacity-60 transition-opacity">Email me</a> if you want to work together.
        </motion.p>
      </div>
    </section>
  );
}
