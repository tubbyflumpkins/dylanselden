'use client';

import { motion } from 'framer-motion';
import ParallaxImage from '@/components/ParallaxImage';
import HighlightedText from '@/components/HighlightedText';

export default function AboutPage() {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-50px' },
    transition: { duration: 0.6, ease: [0.32, 0.72, 0, 1] },
  };

  return (
    <main className="min-h-screen relative z-10 bg-[#FAF9F6]">
      <div className="px-8 md:px-16 lg:px-24 py-24 md:py-32 md:pl-32 lg:pl-40">

        {/* Header */}
        <motion.h1
          className="font-[family-name:var(--font-body)] font-bold text-5xl md:text-6xl lg:text-7xl mb-16 md:mb-24"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.32, 0.72, 0, 1] }}
        >
          About
        </motion.h1>

        {/* Intro Section with Headshot */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-stretch">
          <div className="lg:col-span-7 flex flex-col">
            <motion.h2
              className="font-[family-name:var(--font-body)] font-bold text-3xl md:text-4xl lg:text-5xl mb-8"
              {...fadeIn}
            >
              What I Do
            </motion.h2>
            <motion.p
              className="text-lg md:text-xl leading-relaxed opacity-80 mb-6"
              {...fadeIn}
            >
              <HighlightedText>I'm /Dylan Selden/, a Los Angeles–based /designer, founder, builder, and teacher/. I design physical systems that become objects and spaces: furniture, shelving, and environments that feel warm, engineered, and slightly surreal.</HighlightedText>
            </motion.p>
            <motion.p
              className="text-lg md:text-xl leading-relaxed opacity-80 mb-6"
              {...fadeIn}
            >
              <HighlightedText>I'm the /co-founder of Squarage/, where I lead /design and fabrication/. My work spans designing, prototyping, building manufacturing pipelines, marketing, and web development.</HighlightedText>
            </motion.p>
            <motion.p
              className="text-lg md:text-xl leading-relaxed opacity-80 mb-6"
              {...fadeIn}
            >
              <HighlightedText>I'm a /teacher at LILA/, a French international school in Los Feliz, where I run the maker space and teach art. I love building projects with kids because they don't tolerate nonsense. If something isn't intuitive, they'll tell you instantly or set something on fire trying. It has made me a more human designer.</HighlightedText>
            </motion.p>
            <motion.p
              className="text-lg md:text-xl leading-relaxed opacity-80"
              {...fadeIn}
            >
              <HighlightedText>I'm a /composer and multi-instrumentalist/. I've written for TV and games, and played in many orchestras over the years. I play sax, piano, sitar, dumbek, bass, guitar, and various woodwinds from around the world.</HighlightedText>
            </motion.p>
          </div>
          <div className="lg:col-span-5 h-full">
            <ParallaxImage
              src="/photos/about/headshot.jpg"
              alt="Dylan Selden"
              width={800}
              height={1000}
              className="rounded-sm h-full"
              fill
            />
          </div>
        </div>

      </div>
    </main>
  );
}
