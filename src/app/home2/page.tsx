'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import HighlightedText from '@/components/HighlightedText';
import HomeShelfGenerator from '@/components/HomeShelfGenerator';

export default function Home2() {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.32, 0.72, 0, 1] as const },
  };

  return (
    <main className="min-h-screen bg-[#FAF9F6] relative z-10">
      <div className="pl-24 pr-8 md:pl-32 md:pr-16 lg:pl-36 lg:pr-24 pt-12 md:pt-16">
        {/* Intro text */}
        <motion.div
          className="max-w-4xl mb-0"
          {...fadeIn}
        >
          <p className="text-lg md:text-xl leading-relaxed opacity-80">
            <HighlightedText>I'm /Dylan/, founder of /Squarage Studio/. I build systems that generate custom designs. This is my Corner Shelf Designer:</HighlightedText>
          </p>
        </motion.div>

        {/* Shelf Generator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <HomeShelfGenerator />
        </motion.div>

        {/* Section divider */}
        <hr className="border-t border-[#2C2C2C]/20 mt-4 md:mt-6 mb-12 md:mb-16" />

        {/* How it works section */}
        <motion.div
          className="flex flex-col md:flex-row gap-8 md:gap-12 items-start"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
        >
          <div className="flex-1 max-w-xl">
            <p className="text-lg md:text-xl leading-relaxed opacity-80">
              <HighlightedText>
                With this tool, one design can adapt to any space. /Change is built in/, not treated like a problem.
              </HighlightedText>
            </p>
            <p className="text-lg md:text-xl leading-relaxed opacity-80 mt-4">
              <HighlightedText>
                I built this tool in /Grasshopper/ but you're seeing a simplified version translated into Javascript. The full system generates /G-code/ for CNC manufacturing and handles /over 30 variables/, including material thickness, joint tolerances, slot-joint generation, and part nesting.
              </HighlightedText>
            </p>
          </div>
          <div className="flex-1 max-w-xl">
            <Image
              src="/photos/work/Warped 2.jpg"
              alt="Corner shelf system design"
              width={800}
              height={600}
              className="w-full h-auto"
            />
          </div>
        </motion.div>
      </div>
    </main>
  );
}
