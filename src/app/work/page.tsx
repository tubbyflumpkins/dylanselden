'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

// All images in a flat array
const images = [
  { src: '/photos/work/warped_1.png', alt: 'Warped 1' },
  { src: '/photos/work/warped_2.jpeg', alt: 'Warped 2' },
  { src: '/photos/work/Warped 2.jpg', alt: 'Warped 3' },
  { src: '/photos/work/pool_1.jpeg', alt: 'Pool 1' },
  { src: '/photos/work/pool_2.JPG', alt: 'Pool 2' },
  { src: '/photos/work/pool_3.JPG', alt: 'Pool 3' },
  { src: '/photos/work/pool_4.JPG', alt: 'Pool 4' },
  { src: '/photos/work/pool_5.JPG', alt: 'Pool 5' },
  { src: '/photos/work/tiled_1.JPG', alt: 'Tiled 1' },
  { src: '/photos/work/tiled_2.JPG', alt: 'Tiled 2' },
  { src: '/photos/work/tiled_3.JPG', alt: 'Tiled 3' },
  { src: '/photos/work/painting_1.JPG', alt: 'Painting 1' },
  { src: '/photos/work/painting_2.png', alt: 'Painting 2' },
];

// Distribute images across 3 columns (manually adjusted)
const columns: typeof images[] = [
  // Left column
  [images[0], images[3], images[6], images[9]],
  // Middle column
  [images[1], images[4], images[7], images[10]],
  // Right column
  [images[2], images[5], images[8], images[11], images[12]],
];

export default function WorkPage() {
  return (
    <main className="min-h-screen relative z-10 bg-[#FAF9F6]">
      <div className="px-8 md:px-16 lg:px-24 py-24 md:py-32 md:pl-32 lg:pl-40">
        <motion.h1
          className="font-[family-name:var(--font-body)] font-bold text-5xl md:text-6xl lg:text-7xl mb-16 md:mb-24"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.32, 0.72, 0, 1] }}
        >
          Work
        </motion.h1>

        <div className="grid grid-cols-3 gap-4 md:gap-6">
          {columns.map((column, colIndex) => (
            <div key={colIndex} className="flex flex-col gap-4 md:gap-6">
              {column.map((image, idx) => (
                <motion.div
                  key={image.src}
                  className="relative"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{
                    duration: 0.6,
                    delay: idx * 0.1,
                    ease: [0.32, 0.72, 0, 1],
                  }}
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    width={800}
                    height={800}
                    className="w-full h-auto hover:scale-[1.02] transition-transform duration-500"
                  />
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
