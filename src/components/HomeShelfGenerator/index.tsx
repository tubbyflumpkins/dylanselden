'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CornerShelfParams } from './types';
import {
  generateCornerShelfGeometry,
  projectCornerGeometryWithRotation,
  pointsToPath,
  calculateBounds,
  rotateAndProject,
} from './geometry';
import { Point2D } from './types';

// Derived parameter calculations
function calculateDerivedParams(width: number, length: number, height: number): Omit<CornerShelfParams, 'width' | 'length' | 'height'> {
  // Depth: smooth curve through (minDim=20, depth=7), (32, 10), (80, 13)
  // Using Lagrange interpolation for a smooth quadratic
  const minDim = Math.min(width, length);
  const L0 = ((minDim - 32) * (minDim - 80)) / 720;   // denom: (20-32)*(20-80) = 720
  const L1 = ((minDim - 20) * (minDim - 80)) / -576;  // denom: (32-20)*(32-80) = -576
  const L2 = ((minDim - 20) * (minDim - 32)) / 2880;  // denom: (80-20)*(80-32) = 2880
  const depth = 7 * L0 + 10 * L1 + 13 * L2;

  // Column count: 4 if both width and length <= 50, else 5
  const columnCount = (width > 50 || length > 50) ? 5 : 4;

  // Shelf count: 2 below height 24, then 3-6 from height 24-80
  const shelfCount = height < 24
    ? 2
    : Math.round(3 + (height - 24) * (3 / 56));

  // Amplitude: scales with height (1.0 at height=20, 3.0 at height=80)
  const amplitude = 1.0 + (height - 20) * (2.0 / 60);

  // Shelf offset: scales with height (2 at height=20, 6 at height=80)
  const shelfOffset = 2 + (height - 20) * (4 / 60);

  return {
    depth,
    amplitude,
    shelfCount,
    columnCount,
    shelfOffset,
    columnOffset: 15,    // Fixed
    wallAlign: 0.85,     // Fixed
  };
}

export default function HomeShelfGenerator() {
  // User-controllable parameters (only 3)
  const [userParams, setUserParams] = useState({
    width: 48,
    length: 32,
    height: 24,
  });

  // Calculate full params with derived values
  const params: CornerShelfParams = useMemo(() => {
    const derived = calculateDerivedParams(userParams.width, userParams.length, userParams.height);
    return {
      ...userParams,
      ...derived,
    };
  }, [userParams]);

  // Bounds for oscillation (in radians)
  const minAngleRad = -53 * Math.PI / 180; // 307° expressed as negative
  const maxAngleRad = 40 * Math.PI / 180;

  const [rotation, setRotation] = useState(344 * Math.PI / 180);
  const [velocity, setVelocity] = useState(0.0008);
  const [targetSpeed, setTargetSpeed] = useState(-0.0012); // Negative = towards min (307°)
  const [isDragging, setIsDragging] = useState(false);
  const [draggingHandle, setDraggingHandle] = useState<'width' | 'length' | 'height' | 'corner' | null>(null);
  const [showNodeInstructions, setShowNodeInstructions] = useState(true);
  const [instructionsFading, setInstructionsFading] = useState(false);
  const [showRotateInstruction, setShowRotateInstruction] = useState(true);
  const [rotateInstructionFading, setRotateInstructionFading] = useState(false);
  const lastMouseX = useRef(0);
  const lastMouseY = useRef(0);
  const lastTime = useRef(0);
  const dragVelocity = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const baseSpeed = 0.0012;
  const friction = 0.97;
  const blendRate = 0.01;

  // Project dimension handle 3D points to 2D
  const projectHandlePoint = useCallback((x: number, y: number, z: number): Point2D => {
    return rotateAndProject(
      { x, y, z },
      rotation,
      params.width / 2,
      params.length / 2
    );
  }, [rotation, params.width, params.length]);

  // Calculate screen-space vectors for each axis (used for drag sensitivity)
  const getAxisScreenVector = useCallback((axis: 'width' | 'length' | 'height'): { dx: number; dy: number } => {
    const { length } = params;
    const heightOffset = 8;

    // Project a small movement along the axis to get screen direction
    const delta = 10; // arbitrary small value

    if (axis === 'width') {
      // Width handle is along X axis at y=length, z=0
      const p1 = projectHandlePoint(0, length, 0);
      const p2 = projectHandlePoint(delta, length, 0);
      return { dx: p2.x - p1.x, dy: p2.y - p1.y };
    } else if (axis === 'length') {
      // Length handle is along Y axis at x=width, z=0
      const p1 = projectHandlePoint(0, 0, 0);
      const p2 = projectHandlePoint(0, delta, 0);
      return { dx: p2.x - p1.x, dy: p2.y - p1.y };
    } else {
      // Height handle is vertical at x=-offset, y=length
      const p1 = projectHandlePoint(-heightOffset, length, 0);
      const p2 = projectHandlePoint(-heightOffset, length, delta);
      return { dx: p2.x - p1.x, dy: p2.y - p1.y };
    }
  }, [params, projectHandlePoint]);

  // Convert screen delta to axis value change
  const screenDeltaToAxisDelta = useCallback((
    screenDx: number,
    screenDy: number,
    axis: 'width' | 'length' | 'height'
  ): number => {
    const axisVec = getAxisScreenVector(axis);
    const axisLen = Math.sqrt(axisVec.dx * axisVec.dx + axisVec.dy * axisVec.dy);
    if (axisLen < 0.001) return 0;

    // Project screen delta onto axis direction
    const dot = (screenDx * axisVec.dx + screenDy * axisVec.dy) / (axisLen * axisLen);
    let delta = dot * 10; // Scale factor (10 is the delta we used above)

    // Height needs more sensitivity
    if (axis === 'height') {
      delta *= 2.5;
    }

    // Invert for width and length since drag points are at origin end
    return (axis === 'width' || axis === 'length') ? -delta : delta;
  }, [getAxisScreenVector]);

  // Handle drag start for dimension handles
  const handleDimensionDragStart = useCallback((e: React.MouseEvent, handle: 'width' | 'length' | 'height' | 'corner') => {
    e.stopPropagation();
    setDraggingHandle(handle);
    lastMouseX.current = e.clientX;
    lastMouseY.current = e.clientY;

    // Start fading instructions, then hide after fade completes
    if (showNodeInstructions && !instructionsFading) {
      setInstructionsFading(true);
      setTimeout(() => {
        setShowNodeInstructions(false);
        setInstructionsFading(false);
      }, 1000); // Match the CSS transition duration
    }
  }, [showNodeInstructions, instructionsFading]);

  // Handle drag move for dimension handles
  const handleDimensionDragMove = useCallback((e: React.MouseEvent) => {
    if (!draggingHandle || !svgRef.current) return;

    const svg = svgRef.current;
    const viewBox = svg.viewBox.baseVal;
    const rect = svg.getBoundingClientRect();

    // Convert screen pixels to SVG units
    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;

    const screenDx = (e.clientX - lastMouseX.current) * scaleX;
    const screenDy = (e.clientY - lastMouseY.current) * scaleY;

    if (draggingHandle === 'corner') {
      // Corner handle: treat as a 2D point on the floor plane
      // We need to convert screen movement back to floor plane (X, Y) movement

      // Get screen-space basis vectors for X and Y axes on the floor plane
      const p0 = projectHandlePoint(0, 0, 0);
      const pX = projectHandlePoint(10, 0, 0);  // Unit X direction
      const pY = projectHandlePoint(0, 10, 0);  // Unit Y direction

      // Screen-space vectors for unit movement along each axis
      const ax = pX.x - p0.x, ay = pX.y - p0.y;  // X-axis in screen space
      const bx = pY.x - p0.x, by = pY.y - p0.y;  // Y-axis in screen space

      // Solve the linear system to find floor plane movement from screen delta
      // [ax bx] [deltaX]   [screenDx]
      // [ay by] [deltaY] = [screenDy]
      const det = ax * by - bx * ay;

      if (Math.abs(det) > 0.001) {
        // Inverse: [deltaX]   1/det * [ by -bx] [screenDx]
        //          [deltaY] =         [-ay  ax] [screenDy]
        const floorDeltaX = (by * screenDx - bx * screenDy) / det;
        const floorDeltaY = (-ay * screenDx + ax * screenDy) / det;

        // Scale factor (10 was our unit for the basis vectors)
        const widthDelta = floorDeltaX * 10;
        const lengthDelta = floorDeltaY * 10;

        setUserParams((prev) => ({
          ...prev,
          width: Math.round(Math.max(20, Math.min(80, prev.width + widthDelta))),
          length: Math.round(Math.max(20, Math.min(80, prev.length + lengthDelta))),
        }));
      }
    } else {
      const axisDelta = screenDeltaToAxisDelta(screenDx, screenDy, draggingHandle);

      setUserParams((prev) => {
        const newValue = Math.round(Math.max(20, Math.min(80, prev[draggingHandle] + axisDelta)));
        return { ...prev, [draggingHandle]: newValue };
      });
    }

    lastMouseX.current = e.clientX;
    lastMouseY.current = e.clientY;
  }, [draggingHandle, screenDeltaToAxisDelta]);

  // Handle drag end for dimension handles
  const handleDimensionDragEnd = useCallback(() => {
    setDraggingHandle(null);
  }, []);

  // Helper to normalize angle to -180° to 180° range for bound checking
  const normalizeAngle = (rad: number): number => {
    let deg = (rad * 180 / Math.PI) % 360;
    if (deg > 180) deg -= 360;
    if (deg < -180) deg += 360;
    return deg;
  };

  // Animation loop - velocity-based with bounds
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      if (!isDragging && !draggingHandle) {
        setVelocity((v) => {
          let newV = v * friction;
          newV = newV + (targetSpeed - newV) * blendRate;
          return newV;
        });
        setRotation((prev) => {
          const newRotation = prev + velocity;
          const angleDeg = normalizeAngle(newRotation);

          // Check bounds and reverse target speed if needed
          if (angleDeg <= -53 && targetSpeed < 0) {
            setTargetSpeed(baseSpeed); // Reverse to go towards max
          } else if (angleDeg >= 40 && targetSpeed > 0) {
            setTargetSpeed(-baseSpeed); // Reverse to go towards min
          }

          // Normalize to 0-2π range
          return ((newRotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        });
      }
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isDragging, draggingHandle, velocity, targetSpeed, friction, blendRate, baseSpeed]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't start rotation drag if we're dragging a handle
    if (draggingHandle) return;
    setIsDragging(true);
    lastMouseX.current = e.clientX;
    lastTime.current = performance.now();
    dragVelocity.current = 0;
  }, [draggingHandle]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Handle dimension dragging
    if (draggingHandle) {
      handleDimensionDragMove(e);
      return;
    }

    if (!isDragging) return;

    // Start fading rotate instruction when user actually rotates
    if (showRotateInstruction && !rotateInstructionFading) {
      setRotateInstructionFading(true);
      setTimeout(() => {
        setShowRotateInstruction(false);
        setRotateInstructionFading(false);
      }, 1000);
    }

    const now = performance.now();
    const deltaX = e.clientX - lastMouseX.current;
    const deltaTime = now - lastTime.current;

    if (deltaTime > 0) {
      dragVelocity.current = (deltaX * 0.002) / Math.max(deltaTime, 8);
    }

    setRotation((prev) => (prev + deltaX * 0.005 + Math.PI * 2) % (Math.PI * 2));
    lastMouseX.current = e.clientX;
    lastTime.current = now;
  }, [isDragging, draggingHandle, handleDimensionDragMove]);

  const handleMouseUp = useCallback(() => {
    if (draggingHandle) {
      handleDimensionDragEnd();
      return;
    }
    if (isDragging) {
      // Transfer drag momentum to velocity
      const momentum = Math.max(-0.05, Math.min(0.05, dragVelocity.current * 30));
      setVelocity(momentum);
      setIsDragging(false);
    }
  }, [isDragging, draggingHandle, handleDimensionDragEnd]);

  const handleMouseLeave = useCallback(() => {
    if (draggingHandle) {
      handleDimensionDragEnd();
      return;
    }
    if (isDragging) {
      // Transfer drag momentum to velocity
      const momentum = Math.max(-0.05, Math.min(0.05, dragVelocity.current * 30));
      setVelocity(momentum);
      setIsDragging(false);
    }
  }, [isDragging, draggingHandle, handleDimensionDragEnd]);

  const updateUserParam = (key: 'width' | 'length' | 'height') => (value: number) => {
    setUserParams((prev) => ({ ...prev, [key]: value }));
  };

  // Calculate fixed viewBox by sampling 12 angles, including handle positions
  const fixedViewBox = useMemo(() => {
    const geometry = generateCornerShelfGeometry(params);
    const { width, length, height } = params;
    const heightOffset = 8;

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

      // Also include handle positions in bounds calculation
      const centerX = width / 2;
      const centerY = length / 2;
      const labelPadding = 10; // Extra space for labels
      const handlePoints = [
        // Width handle endpoints
        rotateAndProject({ x: width, y: length, z: 0 }, angle, centerX, centerY),
        rotateAndProject({ x: 0, y: length, z: 0 }, angle, centerX, centerY),
        // Length handle endpoints
        rotateAndProject({ x: width, y: 0, z: 0 }, angle, centerX, centerY),
        // Height handle endpoints (with extra offset for label)
        rotateAndProject({ x: -heightOffset - labelPadding, y: length, z: 0 }, angle, centerX, centerY),
        rotateAndProject({ x: -heightOffset - labelPadding, y: length, z: height }, angle, centerX, centerY),
      ];

      for (const p of handlePoints) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
    }

    // Add minimal padding for labels and handle circles
    const padding = 5;
    const w = maxX - minX + padding * 2;
    const h = maxY - minY + padding * 2;

    // Scale viewBox to make content appear ~10% larger (zoom in)
    const scale = 0.91; // Smaller viewBox = larger content
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const scaledW = w * scale;
    const scaledH = h * scale;
    const newMinX = centerX - scaledW / 2;
    const newMinY = centerY - scaledH / 2;

    // Round to 2 decimal places to avoid hydration mismatch from floating-point precision
    return `${newMinX.toFixed(2)} ${newMinY.toFixed(2)} ${scaledW.toFixed(2)} ${scaledH.toFixed(2)}`;
  }, [params]);

  // Generate projected geometry with current rotation
  const projected = useMemo(() => {
    const geometry = generateCornerShelfGeometry(params);
    return projectCornerGeometryWithRotation(geometry, rotation, params.width, params.length);
  }, [params, rotation]);

  // Calculate projected dimension handle positions
  // Width & Length on floor plane at front edges, Height offset to the left
  const handlePositions = useMemo(() => {
    const { width, length, height } = params;
    const heightOffset = 8; // Offset for height handle to the left of the shelf

    // Shared corner point where width and length meet
    const cornerPoint = projectHandlePoint(width, length, 0);

    // Rotate instruction: text on the ZX plane (back wall at y=0)
    // Text spans the full width of the shape, with proportional height
    const rotateTextOffset = 3; // inches above the top of shelf
    const textWidth3D = 6; // fixed width in inches
    const textHeight3D = 3; // text height in inches
    const textCenterX = width / 2;
    const textBottomZ = height + rotateTextOffset;
    const textTopZ = textBottomZ + textHeight3D;

    // Project the 4 corners of the text bounding box (on ZX plane, y=0)
    // In 3D: higher Z = up. In SVG: lower Y = up.
    // So 3D "top" (higher Z) projects to screen "top" (lower Y)
    const p3dTopLeft = projectHandlePoint(textCenterX - textWidth3D / 2, 0, textTopZ);
    const p3dTopRight = projectHandlePoint(textCenterX + textWidth3D / 2, 0, textTopZ);
    const p3dBottomLeft = projectHandlePoint(textCenterX - textWidth3D / 2, 0, textBottomZ);
    const p3dBottomRight = projectHandlePoint(textCenterX + textWidth3D / 2, 0, textBottomZ);

    // SVG text: (0,0) is top-left, x goes right, y goes down
    // Map: (0,0)->screenTopLeft, (1,0)->screenTopRight, (0,1)->screenBottomLeft
    // In screen coords: 3D top = screen top (lower Y)
    const rotateTextMatrix = {
      a: p3dTopRight.x - p3dTopLeft.x,      // x-axis goes from topLeft to topRight
      b: p3dTopRight.y - p3dTopLeft.y,
      c: p3dBottomLeft.x - p3dTopLeft.x,    // y-axis goes from topLeft to bottomLeft
      d: p3dBottomLeft.y - p3dTopLeft.y,
      e: p3dTopLeft.x,                       // origin at topLeft
      f: p3dTopLeft.y,
    };

    return {
      // Width handle: along X axis at the front edge (y = length), on floor
      // Anchor at the end (width, length), drag at origin (0, length)
      width: {
        anchor: cornerPoint,
        drag: projectHandlePoint(0, length, 0),
        label: projectHandlePoint(width / 2, length, 0),
      },
      // Length handle: along Y axis at the right edge (x = width), on floor
      // Anchor at front (width, length), drag at back (width, 0)
      length: {
        anchor: cornerPoint,
        drag: projectHandlePoint(width, 0, 0),
        label: projectHandlePoint(width, length / 2, 0),
      },
      // Corner handle: shared anchor point that controls both width and length
      corner: cornerPoint,
      // Height handle: vertical, offset to the left at the front-left corner
      height: {
        anchor: projectHandlePoint(-heightOffset, length, 0),
        drag: projectHandlePoint(-heightOffset, length, height),
        label: projectHandlePoint(-heightOffset, length, height / 2),
      },
      // Rotate instruction - affine transform matrix for 3D text on ZX plane
      rotateInstruction: {
        matrix: rotateTextMatrix,
      },
    };
  }, [params, projectHandlePoint]);

  // Handle radius for interaction - scale based on viewBox
  const handleRadius = useMemo(() => {
    const vb = fixedViewBox.split(' ').map(Number);
    const viewBoxWidth = vb[2];
    return Math.max(2, viewBoxWidth * 0.02);
  }, [fixedViewBox]);

  const anchorSize = handleRadius * 0.8;

  return (
    <div className="flex flex-col w-full max-w-[1600px]" style={{ fontSize: 'clamp(14px, 1.4vw, 24px)' }}>
      {/* SVG Visualization with integrated dimension handles */}
      <motion.div
        className="w-full flex items-center justify-center h-[50em] max-h-[80vh]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <svg
          ref={svgRef}
          viewBox={fixedViewBox}
          width="100%"
          height="100%"
          className={draggingHandle ? 'cursor-grabbing' : 'cursor-grab'}
          style={{ overflow: 'visible' }}
          preserveAspectRatio="xMidYMid meet"
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

          {/* Rotate instruction - text on ZX plane (back wall), rendered with 3D perspective */}
          {showRotateInstruction && (() => {
            const m = handlePositions.rotateInstruction.matrix;
            return (
              <g style={{ opacity: rotateInstructionFading ? 0 : 0.5, transition: 'opacity 1s ease-out' }}>
                <text
                  fill="#2C2C2C"
                  fontFamily="monospace"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ pointerEvents: 'none', userSelect: 'none', fontSize: '0.6px' }}
                  x={0.5}
                  y={0.5}
                  transform={`matrix(${m.a}, ${m.b}, ${m.c}, ${m.d}, ${m.e}, ${m.f})`}
                >
                  drag to rotate
                </text>
              </g>
            );
          })()}

          {/* Dimension Handles */}
          {/* Width line (X-axis) */}
          <g className="dimension-handle">
            {/* Dotted line */}
            <line
              x1={handlePositions.width.anchor.x}
              y1={handlePositions.width.anchor.y}
              x2={handlePositions.width.drag.x}
              y2={handlePositions.width.drag.y}
              stroke="#2C2C2C"
              strokeWidth="0.3"
              strokeDasharray="1.5 1"
              opacity="0.6"
            />
            {/* Anchor square at endpoint */}
            <rect
              x={handlePositions.width.drag.x - anchorSize / 2}
              y={handlePositions.width.drag.y - anchorSize / 2}
              width={anchorSize}
              height={anchorSize}
              fill="#2C2C2C"
              opacity="0.5"
            />
            {/* Label */}
            <text
              x={handlePositions.width.label.x}
              y={handlePositions.width.label.y + handleRadius * 2.5}
              textAnchor="middle"
              fontSize={handleRadius * 1.8}
              fill="#2C2C2C"
              opacity="0.8"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {userParams.width}"
            </text>
          </g>

          {/* Length line (Y-axis) */}
          <g className="dimension-handle">
            {/* Dotted line */}
            <line
              x1={handlePositions.length.anchor.x}
              y1={handlePositions.length.anchor.y}
              x2={handlePositions.length.drag.x}
              y2={handlePositions.length.drag.y}
              stroke="#2C2C2C"
              strokeWidth="0.3"
              strokeDasharray="1.5 1"
              opacity="0.6"
            />
            {/* Anchor square at endpoint */}
            <rect
              x={handlePositions.length.drag.x - anchorSize / 2}
              y={handlePositions.length.drag.y - anchorSize / 2}
              width={anchorSize}
              height={anchorSize}
              fill="#2C2C2C"
              opacity="0.5"
            />
            {/* Label */}
            <text
              x={handlePositions.length.label.x + handleRadius * 2.5}
              y={handlePositions.length.label.y}
              textAnchor="start"
              fontSize={handleRadius * 1.8}
              fill="#2C2C2C"
              opacity="0.8"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {userParams.length}"
            </text>
          </g>

          {/* Corner Handle (draggable - controls both width and length) */}
          <g className="dimension-handle">
            <circle
              cx={handlePositions.corner.x}
              cy={handlePositions.corner.y}
              r={handleRadius}
              fill={draggingHandle === 'corner' ? '#4a9b4e' : '#2C2C2C'}
              opacity={draggingHandle === 'corner' ? 1 : 0.7}
              style={{ cursor: 'grab' }}
              onMouseDown={(e) => handleDimensionDragStart(e, 'corner')}
            />
            {/* Instruction label for corner node - arcs below */}
            {showNodeInstructions && (
              <g style={{ opacity: instructionsFading ? 0 : 0.5, transition: 'opacity 1s ease-out' }}>
                <defs>
                  <path
                    id="cornerCirclePath"
                    d={`M ${handlePositions.corner.x - handleRadius * 3},${handlePositions.corner.y} A ${handleRadius * 3},${handleRadius * 3} 0 0,0 ${handlePositions.corner.x + handleRadius * 3},${handlePositions.corner.y}`}
                    fill="none"
                  />
                </defs>
                <text
                  fontSize={handleRadius * 0.9}
                  fill="#2C2C2C"
                  fontFamily="monospace"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  <textPath href="#cornerCirclePath" startOffset="50%" textAnchor="middle">
                    drag to resize
                  </textPath>
                </text>
              </g>
            )}
          </g>

          {/* Height Handle (Z-axis / vertical) */}
          <g className="dimension-handle">
            {/* Dotted line */}
            <line
              x1={handlePositions.height.anchor.x}
              y1={handlePositions.height.anchor.y}
              x2={handlePositions.height.drag.x}
              y2={handlePositions.height.drag.y}
              stroke="#2C2C2C"
              strokeWidth="0.3"
              strokeDasharray="1.5 1"
              opacity="0.6"
            />
            {/* Anchor square at bottom */}
            <rect
              x={handlePositions.height.anchor.x - anchorSize / 2}
              y={handlePositions.height.anchor.y - anchorSize / 2}
              width={anchorSize}
              height={anchorSize}
              fill="#2C2C2C"
              opacity="0.5"
            />
            {/* Draggable circle at top */}
            <circle
              cx={handlePositions.height.drag.x}
              cy={handlePositions.height.drag.y}
              r={handleRadius}
              fill={draggingHandle === 'height' ? '#4a9b4e' : '#2C2C2C'}
              opacity={draggingHandle === 'height' ? 1 : 0.7}
              style={{ cursor: 'grab' }}
              onMouseDown={(e) => handleDimensionDragStart(e, 'height')}
            />
            {/* Instruction label for height node - arcs above */}
            {showNodeInstructions && (
              <g style={{ opacity: instructionsFading ? 0 : 0.5, transition: 'opacity 1s ease-out' }}>
                <defs>
                  <path
                    id="heightCirclePath"
                    d={`M ${handlePositions.height.drag.x - handleRadius * 2.5},${handlePositions.height.drag.y} A ${handleRadius * 2.5},${handleRadius * 2.5} 0 0,1 ${handlePositions.height.drag.x + handleRadius * 2.5},${handlePositions.height.drag.y}`}
                    fill="none"
                  />
                </defs>
                <text
                  fontSize={handleRadius * 0.9}
                  fill="#2C2C2C"
                  fontFamily="monospace"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  <textPath href="#heightCirclePath" startOffset="50%" textAnchor="middle">
                    drag to resize
                  </textPath>
                </text>
              </g>
            )}
            {/* Label */}
            <text
              x={handlePositions.height.label.x - handleRadius * 2}
              y={handlePositions.height.label.y}
              textAnchor="end"
              fontSize={handleRadius * 1.8}
              fill="#2C2C2C"
              opacity="0.8"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {userParams.height}"
            </text>
          </g>

        </svg>
      </motion.div>


    </div>
  );
}
