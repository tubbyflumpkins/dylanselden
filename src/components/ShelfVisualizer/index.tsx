'use client';

import { useState, useMemo, useEffect } from 'react';
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
}

function Slider({ label, value, min, max, step = 1, onChange }: SliderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="opacity-70">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-[#2C2C2C]/10 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-[#2C2C2C]
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-110
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-[#2C2C2C]
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer"
      />
    </div>
  );
}

export default function ShelfVisualizer() {
  const [params, setParams] = useState<ShelfParams>({
    width: 80,
    length: 0, // Not used for flat wall shelves
    depth: 10,
    height: 50,
    amplitude: 2.5,
    shelfCount: 4,
    columnCount: 5,
    offset: 6,
  });

  const [rotation, setRotation] = useState(0.35);

  // Animate rotation (slow speed)
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      setRotation((prev) => (prev - 0.0008 + Math.PI * 2) % (Math.PI * 2));
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const updateParam = (key: keyof ShelfParams) => (value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  // Generate and project geometry with rotation
  const { projected, viewBox } = useMemo(() => {
    const geometry = generateShelfGeometry(params);
    const projected = projectGeometryWithRotation(geometry, rotation, params.width, params.height);
    const bounds = calculateBounds(projected);

    const padding = 10;
    const w = bounds.maxX - bounds.minX + padding * 2;
    const h = bounds.maxY - bounds.minY + padding * 2;

    return {
      projected,
      viewBox: `${bounds.minX - padding} ${bounds.minY - padding} ${w} ${h}`,
    };
  }, [params, rotation]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-4">
      {/* Sliders Panel */}
      <motion.div
        className="flex flex-col gap-5 w-full lg:w-56 shrink-0"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Slider
          label="Width"
          value={params.width}
          min={30}
          max={100}
          onChange={updateParam('width')}
        />
        <Slider
          label="Height"
          value={params.height}
          min={20}
          max={80}
          onChange={updateParam('height')}
        />
        <Slider
          label="Depth"
          value={params.depth}
          min={10}
          max={25}
          onChange={updateParam('depth')}
        />
        <Slider
          label="Amplitude"
          value={params.amplitude}
          min={0}
          max={6}
          step={0.5}
          onChange={updateParam('amplitude')}
        />
        <Slider
          label="Shelves"
          value={params.shelfCount}
          min={2}
          max={8}
          onChange={updateParam('shelfCount')}
        />
        <Slider
          label="Columns"
          value={params.columnCount}
          min={2}
          max={8}
          onChange={updateParam('columnCount')}
        />
        <Slider
          label="Offset"
          value={params.offset}
          min={2}
          max={10}
          onChange={updateParam('offset')}
        />
      </motion.div>

      {/* SVG Visualization */}
      <motion.div
        className="flex-1 flex items-start justify-start h-[400px] max-h-[400px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <svg
          viewBox={viewBox}
          className="w-full h-full max-w-xl"
          preserveAspectRatio="xMidYMid meet"
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
