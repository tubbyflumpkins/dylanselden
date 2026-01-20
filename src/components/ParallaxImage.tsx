'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import { useRef } from 'react';

interface ParallaxImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  speed?: number;
  fill?: boolean; // Fill container height
}

export default function ParallaxImage({
  src,
  alt,
  width,
  height,
  className = '',
  speed = 0.5,
  fill = false,
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Transform scroll progress to a subtle vertical movement
  const y = useTransform(scrollYProgress, [0, 1], ['-5%', '5%']);

  return (
    <motion.div
      ref={ref}
      className={`overflow-hidden ${fill ? 'h-full' : ''} ${className}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
    >
      <motion.div className={fill ? 'h-full' : ''} style={{ y }}>
        {fill ? (
          <div className="relative h-full w-full">
            <Image
              src={src}
              alt={alt}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            className="w-full h-auto object-cover"
          />
        )}
      </motion.div>
    </motion.div>
  );
}
