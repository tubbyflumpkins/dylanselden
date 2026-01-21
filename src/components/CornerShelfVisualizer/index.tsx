'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CornerShelfParams } from './types';
import {
  generateCornerShelfGeometry,
  projectCornerGeometryWithRotation,
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

export default function CornerShelfVisualizer() {
  // Initial state for entry animation
  const [params, setParams] = useState<CornerShelfParams>({
    width: 30,        // Will animate to 50
    length: 30,       // Will animate to 50
    depth: 8,         // Will animate to 15
    height: 20,       // Will animate to 50
    amplitude: 0,     // Will animate to 2.5
    shelfCount: 2,    // Will animate to 5
    columnCount: 2,   // Will animate to 5
    shelfOffset: 6,
    columnOffset: 6,
  });


  // Entry animation
  useEffect(() => {
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animateValue = (
      key: keyof CornerShelfParams,
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

    const animateSteps = (
      key: keyof CornerShelfParams,
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

    const runAnimation = async () => {
      await new Promise(resolve => setTimeout(resolve, 700));
      setAnimatingSlider('width');
      await Promise.all([
        animateValue('width', 30, 50, 1800, 0),
        animateValue('length', 30, 50, 1800, 0),
        animateValue('height', 20, 50, 1800, 0),
        animateValue('depth', 8, 15, 1800, 0),
      ]);
      setAnimatingSlider('columnCount');
      await animateSteps('columnCount', 2, 5, 400, 300);
      setAnimatingSlider('shelfCount');
      await animateSteps('shelfCount', 2, 5, 400, 300);
      setAnimatingSlider('amplitude');
      await animateValue('amplitude', 0, 2.5, 1500, 300);
      setAnimatingSlider(null);
    };

    runAnimation();
  }, []);

  const [rotation, setRotation] = useState(20 * Math.PI / 180);
  const [velocity, setVelocity] = useState(0.0008);
  const [animatingSlider, setAnimatingSlider] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastMouseX = useRef(0);
  const lastTime = useRef(0);
  const dragVelocity = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const defaultSpeed = -0.0012;
  const friction = 0.97;
  const blendRate = 0.01;

  // Animation loop
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      if (!isDragging) {
        setVelocity((v) => {
          let newV = v * friction;
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

  const updateParam = (key: keyof CornerShelfParams) => (value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  // Calculate fixed viewBox by sampling 12 angles
  const fixedViewBox = useMemo(() => {
    const geometry = generateCornerShelfGeometry(params);

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    // Sample 12 angles around the full rotation
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const projected = projectCornerGeometryWithRotation(geometry, angle, params.width, params.length);
      const bounds = calculateBounds(projected);

      minX = Math.min(minX, bounds.minX);
      maxX = Math.max(maxX, bounds.maxX);
      minY = Math.min(minY, bounds.minY);
      maxY = Math.max(maxY, bounds.maxY);
    }

    const padding = 10;
    const w = maxX - minX + padding * 2;
    const h = maxY - minY + padding * 2;

    const scale = 1 / 1.15;
    const scaledW = w * scale;
    const scaledH = h * scale;
    const offsetX = (w - scaledW) / 2;
    const offsetY = (h - scaledH) / 2;

    return `${minX - padding + offsetX} ${minY - padding + offsetY} ${scaledW} ${scaledH}`;
  }, [params]);

  // Generate projected geometry with current rotation
  const projected = useMemo(() => {
    const geometry = generateCornerShelfGeometry(params);
    return projectCornerGeometryWithRotation(geometry, rotation, params.width, params.length);
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
          min={20}
          max={80}
          onChange={updateParam('width')}
          isAnimating={animatingSlider === 'width'}
        />
        <Slider
          label="Length (in)"
          value={params.length}
          min={20}
          max={80}
          onChange={updateParam('length')}
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
          min={5}
          max={25}
          onChange={updateParam('depth')}
          isAnimating={animatingSlider === 'width'}
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
          label="Shelf Offset"
          value={params.shelfOffset}
          min={0}
          max={15}
          onChange={updateParam('shelfOffset')}
        />
        <Slider
          label="Column Offset"
          value={params.columnOffset}
          min={0}
          max={15}
          onChange={updateParam('columnOffset')}
        />
        <Slider
          label="Camera Angle"
          value={Math.round(rotation * 180 / Math.PI)}
          min={0}
          max={360}
          onChange={(deg) => setRotation(deg * Math.PI / 180)}
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
              {/* Back edge along X axis (y=0) */}
              <path
                d={pointsToPath(shelf.backEdgeX)}
                fill="none"
                stroke="#2C2C2C"
                strokeWidth="0.4"
              />
              {/* Back edge along Y axis (x=0) */}
              <path
                d={pointsToPath(shelf.backEdgeY)}
                fill="none"
                stroke="#2C2C2C"
                strokeWidth="0.4"
              />
              {/* Width side connecting front to (width, 0) */}
              <line
                x1={shelf.widthSide[0].x}
                y1={shelf.widthSide[0].y}
                x2={shelf.widthSide[1].x}
                y2={shelf.widthSide[1].y}
                stroke="#2C2C2C"
                strokeWidth="0.4"
              />
              {/* Length side connecting front to (0, length) */}
              <line
                x1={shelf.lengthSide[0].x}
                y1={shelf.lengthSide[0].y}
                x2={shelf.lengthSide[1].x}
                y2={shelf.lengthSide[1].y}
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
              {/* Back edge (to origin) */}
              <path
                d={pointsToPath(col.backEdge)}
                fill="none"
                stroke="#2C2C2C"
                strokeWidth="0.4"
              />
              {/* Top side */}
              <line
                x1={col.topSide[0].x}
                y1={col.topSide[0].y}
                x2={col.topSide[1].x}
                y2={col.topSide[1].y}
                stroke="#2C2C2C"
                strokeWidth="0.4"
              />
              {/* Bottom side */}
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
