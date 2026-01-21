'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShelfParams } from './types';
import {
  generateShelfGeometry,
  projectGeometryWithRotation,
  pointsToPath,
  calculateBounds,
} from './geometry';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  isAnimating?: boolean;
}

function Slider({ label, value, min, max, step = 1, onChange, isAnimating = false }: SliderProps) {
  return (
    <div className="flex flex-col gap-[0.3em]">
      <div className="flex justify-between text-base">
        <span className="opacity-70">{label}</span>
        <span className="font-medium">{typeof value === 'number' ? (step && step < 1 ? value.toFixed(1) : Math.round(value)) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-[0.6em] bg-[#2C2C2C]/10 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-[1.2em]
          [&::-webkit-slider-thumb]:h-[1.2em]
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-[#2C2C2C]
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-all
          [&::-webkit-slider-thumb]:hover:scale-110
          [&::-moz-range-thumb]:w-[1.2em]
          [&::-moz-range-thumb]:h-[1.2em]
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-[#2C2C2C]
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer
          ${isAnimating ? '[&::-webkit-slider-thumb]:shadow-[0_0_0_4px_#4a9b4e] [&::-moz-range-thumb]:shadow-[0_0_0_4px_#4a9b4e]' : ''}`}
      />
    </div>
  );
}

export default function ShelfVisualizer() {
  // Initial state for entry animation
  const [params, setParams] = useState<ShelfParams>({
    width: 30,      // Will animate to 80
    length: 0,
    depth: 10,
    height: 20,     // Will animate to 50
    amplitude: 0,   // Will animate to 2.5
    shelfCount: 2,  // Will animate to 5
    columnCount: 2, // Will animate to 5
    offset: 6,      // Stays fixed
  });

  // Entry animation
  useEffect(() => {
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animateValue = (
      key: keyof ShelfParams,
      from: number,
      to: number,
      duration: number,
      delay: number
    ) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const startTime = performance.now();
          const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutCubic(progress);
            const value = from + (to - from) * easedProgress;

            setParams(prev => ({ ...prev, [key]: value }));

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              resolve();
            }
          };
          requestAnimationFrame(animate);
        }, delay);
      });
    };

    // Step through integer values at constant intervals
    const animateSteps = (
      key: keyof ShelfParams,
      from: number,
      to: number,
      intervalMs: number,
      delay: number
    ) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          let current = from;
          const step = () => {
            current += 1;
            setParams(prev => ({ ...prev, [key]: current }));
            if (current < to) {
              setTimeout(step, intervalMs);
            } else {
              resolve();
            }
          };
          setTimeout(step, intervalMs);
        }, delay);
      });
    };

    // Sequence: (width + height) → columns → shelves → amplitude
    const runAnimation = async () => {
      await new Promise(resolve => setTimeout(resolve, 700)); // Initial delay
      setAnimatingSlider('width');
      await Promise.all([
        animateValue('width', 30, 80, 1800, 0),           // Width: 30 → 80
        animateValue('height', 20, 50, 1800, 0),          // Height: 20 → 50 (simultaneous)
      ]);
      setAnimatingSlider('columnCount');
      await animateSteps('columnCount', 2, 5, 400, 300);  // Columns: 2 → 3 → 4 → 5
      setAnimatingSlider('shelfCount');
      await animateSteps('shelfCount', 2, 5, 400, 300);   // Shelves: 2 → 3 → 4 → 5
      setAnimatingSlider('amplitude');
      await animateValue('amplitude', 0, 2.5, 1500, 300); // Amplitude: 0 → 2.5 (last)
      setAnimatingSlider(null);
    };

    runAnimation();
  }, []);

  const [rotation, setRotation] = useState(4.75);
  const [velocity, setVelocity] = useState(-0.0008); // Default rotation speed
  const [animatingSlider, setAnimatingSlider] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastMouseX = useRef(0);
  const lastTime = useRef(0);
  const dragVelocity = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const defaultSpeed = 0.0012;
  const friction = 0.97; // Velocity decay (closer to 1 = slower decay)
  const blendRate = 0.01; // How fast to return to default speed

  // Animation loop
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      if (!isDragging) {
        setVelocity((v) => {
          // First apply friction to decay momentum
          let newV = v * friction;
          // Then blend toward default speed
          newV = newV + (defaultSpeed - newV) * blendRate;
          return newV;
        });
        setRotation((prev) => (prev + velocity) % (Math.PI * 2));
      }
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isDragging, velocity]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    lastMouseX.current = e.clientX;
    lastTime.current = performance.now();
    dragVelocity.current = 0;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const now = performance.now();
    const deltaX = e.clientX - lastMouseX.current;
    const deltaTime = now - lastTime.current;

    if (deltaTime > 0) {
      dragVelocity.current = (deltaX * 0.002) / Math.max(deltaTime, 8);
    }

    setRotation((prev) => (prev + deltaX * 0.005 + Math.PI * 2) % (Math.PI * 2));
    lastMouseX.current = e.clientX;
    lastTime.current = now;
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      // Clamp velocity to prevent crazy speeds
      const momentum = Math.max(-0.05, Math.min(0.05, dragVelocity.current * 30));
      setVelocity(momentum);
      setIsDragging(false);
    }
  }, [isDragging]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      const momentum = Math.max(-0.05, Math.min(0.05, dragVelocity.current * 30));
      setVelocity(momentum);
      setIsDragging(false);
    }
  }, [isDragging]);

  const updateParam = (key: keyof ShelfParams) => (value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  // Calculate fixed viewBox using max height (3.93) and max width (5.5)
  const fixedViewBox = useMemo(() => {
    const geometry = generateShelfGeometry(params);

    // Get bounds at tallest angle (3.93)
    const projectedTall = projectGeometryWithRotation(geometry, 3.93, params.width, params.height);
    const boundsTall = calculateBounds(projectedTall);

    // Get bounds at widest angle (5.5)
    const projectedWide = projectGeometryWithRotation(geometry, 5.5, params.width, params.height);
    const boundsWide = calculateBounds(projectedWide);

    // Combine: use widest X range and tallest Y range
    const minX = Math.min(boundsTall.minX, boundsWide.minX);
    const maxX = Math.max(boundsTall.maxX, boundsWide.maxX);
    const minY = Math.min(boundsTall.minY, boundsWide.minY);
    const maxY = Math.max(boundsTall.maxY, boundsWide.maxY);

    const padding = 10;
    const w = maxX - minX + padding * 2;
    const h = maxY - minY + padding * 2;

    // Scale down viewBox by 15% to make content appear larger
    const scale = 1 / 1.15;
    const scaledW = w * scale;
    const scaledH = h * scale;
    const offsetX = (w - scaledW) / 2;
    const offsetY = (h - scaledH) / 2;

    return `${minX - padding + offsetX} ${minY - padding + offsetY} ${scaledW} ${scaledH}`;
  }, [params]);

  // Generate projected geometry with current rotation
  const projected = useMemo(() => {
    const geometry = generateShelfGeometry(params);
    return projectGeometryWithRotation(geometry, rotation, params.width, params.height);
  }, [params, rotation]);

  return (
    <div className="flex flex-col lg:flex-row gap-[2vw] lg:gap-[3.5vw] w-full max-w-[1600px]" style={{ fontSize: 'clamp(14px, 1.4vw, 24px)' }}>
      {/* Sliders Panel */}
      <motion.div
        className="flex flex-col gap-[1.2em] w-full lg:w-[18em] shrink-0"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Slider
          label="Width (in)"
          value={params.width}
          min={30}
          max={100}
          onChange={updateParam('width')}
          isAnimating={animatingSlider === 'width'}
        />
        <Slider
          label="Height (in)"
          value={params.height}
          min={20}
          max={80}
          onChange={updateParam('height')}
          isAnimating={animatingSlider === 'width'}
        />
        <Slider
          label="Depth (in)"
          value={params.depth}
          min={10}
          max={25}
          onChange={updateParam('depth')}
          isAnimating={animatingSlider === 'depth'}
        />
        <Slider
          label="Amplitude"
          value={params.amplitude}
          min={0}
          max={6}
          step={0.5}
          onChange={updateParam('amplitude')}
          isAnimating={animatingSlider === 'amplitude'}
        />
        <Slider
          label="Shelves"
          value={params.shelfCount}
          min={2}
          max={8}
          onChange={updateParam('shelfCount')}
          isAnimating={animatingSlider === 'shelfCount'}
        />
        <Slider
          label="Columns"
          value={params.columnCount}
          min={2}
          max={8}
          onChange={updateParam('columnCount')}
          isAnimating={animatingSlider === 'columnCount'}
        />
        <Slider
          label="Offset"
          value={params.offset}
          min={2}
          max={10}
          onChange={updateParam('offset')}
          isAnimating={animatingSlider === 'offset'}
        />

      </motion.div>

      {/* SVG Visualization */}
      <motion.div
        className="flex-1 flex items-start justify-start h-[32em] max-h-[60vh] -mt-[0.8em]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <svg
          ref={svgRef}
          viewBox={fixedViewBox}
          className="w-full h-full max-w-full cursor-grab active:cursor-grabbing"
          preserveAspectRatio="xMinYMid meet"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* Shelf pieces (horizontal slices) */}
          {projected.shelves.map((shelf, idx) => (
            <g key={`shelf-${idx}`}>
              {/* Front wavy edge */}
              <path
                d={pointsToPath(shelf.frontEdge)}
                fill="none"
                stroke="#2C2C2C"
                strokeWidth="0.4"
              />
              {/* Back straight edge */}
              <path
                d={pointsToPath(shelf.backEdge)}
                fill="none"
                stroke="#2C2C2C"
                strokeWidth="0.4"
              />
              {/* Left side connecting front to back */}
              <line
                x1={shelf.leftSide[0].x}
                y1={shelf.leftSide[0].y}
                x2={shelf.leftSide[1].x}
                y2={shelf.leftSide[1].y}
                stroke="#2C2C2C"
                strokeWidth="0.4"
              />
              {/* Right side connecting front to back */}
              <line
                x1={shelf.rightSide[0].x}
                y1={shelf.rightSide[0].y}
                x2={shelf.rightSide[1].x}
                y2={shelf.rightSide[1].y}
                stroke="#2C2C2C"
                strokeWidth="0.4"
              />
            </g>
          ))}

          {/* Column pieces (vertical slices) */}
          {projected.columns.map((col, idx) => (
            <g key={`col-${idx}`}>
              {/* Front wavy edge */}
              <path
                d={pointsToPath(col.frontEdge)}
                fill="none"
                stroke="#2C2C2C"
                strokeWidth="0.4"
              />
              {/* Back straight edge */}
              <path
                d={pointsToPath(col.backEdge)}
                fill="none"
                stroke="#2C2C2C"
                strokeWidth="0.4"
              />
              {/* Top side connecting front to back */}
              <line
                x1={col.topSide[0].x}
                y1={col.topSide[0].y}
                x2={col.topSide[1].x}
                y2={col.topSide[1].y}
                stroke="#2C2C2C"
                strokeWidth="0.4"
              />
              {/* Bottom side connecting front to back */}
              <line
                x1={col.bottomSide[0].x}
                y1={col.bottomSide[0].y}
                x2={col.bottomSide[1].x}
                y2={col.bottomSide[1].y}
                stroke="#2C2C2C"
                strokeWidth="0.4"
              />
            </g>
          ))}
        </svg>
      </motion.div>
    </div>
  );
}
