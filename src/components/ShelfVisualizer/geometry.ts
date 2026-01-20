import { Point3D, Point2D, ShelfParams } from './types';

/**
 * FLAT WALL SHELF GENERATOR
 *
 * The shelf sits against a flat wall. We create a wavy front surface by:
 * 1. Creating 3 vertical sine curves along the width (x-axis)
 *    - Left curve at x=0
 *    - Center curve at x=width/2 (INVERTED sine)
 *    - Right curve at x=width
 * 2. The sine curves go vertically (z-axis) and the wave affects depth (y-axis)
 * 3. Loft between curves to create front surface
 * 4. Extrude back to wall to create solid block
 * 5. Slice horizontally (shelves) and vertically (columns)
 */

// Isometric projection
const ISO_ANGLE = Math.PI / 6;
const COS_ISO = Math.cos(ISO_ANGLE);
const SIN_ISO = Math.sin(ISO_ANGLE);

export function isometricProject(p: Point3D): Point2D {
  // X goes right-down, Y goes left-down, Z goes up
  return {
    x: (p.x - p.y) * COS_ISO,
    y: -p.z + (p.x + p.y) * SIN_ISO * 0.5,
  };
}

/**
 * Rotate a point around the Y-axis (vertical axis in our coordinate system)
 * and then apply isometric projection
 */
export function rotateAndProject(p: Point3D, angle: number, centerX: number, centerY: number): Point2D {
  // Translate to center
  const x = p.x - centerX;
  const y = p.y - centerY;

  // Rotate around vertical axis (Z-axis in 3D, but we rotate X and Y)
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const rotatedX = x * cosA - y * sinA;
  const rotatedY = x * sinA + y * cosA;

  // Translate back and project
  return isometricProject({
    x: rotatedX + centerX,
    y: rotatedY + centerY,
    z: p.z,
  });
}

/**
 * Generate a vertical sine curve
 * The curve goes from z=0 to z=height
 * The sine wave affects the y-position (depth)
 */
function generateVerticalSineCurve(
  x: number,
  baseY: number,
  height: number,
  amplitude: number,
  inverted: boolean,
  segments: number = 40
): Point3D[] {
  const points: Point3D[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const z = t * height;
    // Sine wave: one full period over the height
    const sineValue = Math.sin(t * Math.PI * 2);
    const yOffset = inverted ? -amplitude * sineValue : amplitude * sineValue;
    points.push({
      x,
      y: baseY + yOffset,
      z,
    });
  }
  return points;
}

/**
 * Smooth cosine interpolation - creates curved S-shape transition
 */
function cosineInterpolate(a: number, b: number, t: number): number {
  const t2 = (1 - Math.cos(t * Math.PI)) / 2;
  return a * (1 - t2) + b * t2;
}

/**
 * Interpolate Y value between three curves at a given X position
 * Uses cosine interpolation for smooth curved transitions
 */
function interpolateY(
  x: number,
  width: number,
  leftY: number,
  centerY: number,
  rightY: number
): number {
  // Cosine interpolation for smooth curved transitions
  if (x <= width / 2) {
    const t = x / (width / 2);
    return cosineInterpolate(leftY, centerY, t);
  } else {
    const t = (x - width / 2) / (width / 2);
    return cosineInterpolate(centerY, rightY, t);
  }
}

/**
 * Interpolate Y value between five curves at a given X position
 * Curves at: 0 (straight), 1/6 (sine), 1/2 (inverted sine), 5/6 (sine), 1 (straight)
 */
function interpolateY5(
  x: number,
  width: number,
  y0: number,  // x=0: straight line
  y1: number,  // x=1/6: first sine
  y2: number,  // x=1/2: center (inverted)
  y3: number,  // x=5/6: second sine
  y4: number   // x=1: straight line
): number {
  const xNorm = x / width; // Normalize to 0-1

  if (xNorm <= 1/6) {
    const t = xNorm / (1/6);
    return cosineInterpolate(y0, y1, t);
  } else if (xNorm <= 1/2) {
    const t = (xNorm - 1/6) / (1/2 - 1/6);
    return cosineInterpolate(y1, y2, t);
  } else if (xNorm <= 5/6) {
    const t = (xNorm - 1/2) / (5/6 - 1/2);
    return cosineInterpolate(y2, y3, t);
  } else {
    const t = (xNorm - 5/6) / (1 - 5/6);
    return cosineInterpolate(y3, y4, t);
  }
}

/**
 * Get the front surface Y position at any (x, z) point
 * Uses 5 control curves: straight edges with sine curves in between
 */
function getFrontSurfaceY(
  x: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  amplitude: number
): number {
  const t = z / height;
  const sineValue = Math.sin(t * Math.PI * 2);

  // 5 control curves:
  const y0 = depth;                        // x=0: straight vertical line
  const y1 = depth + amplitude * sineValue; // x=1/6: normal sine
  const y2 = depth - amplitude * sineValue; // x=1/2: inverted sine
  const y3 = depth + amplitude * sineValue; // x=5/6: normal sine
  const y4 = depth;                        // x=1: straight vertical line

  return interpolateY5(x, width, y0, y1, y2, y3, y4);
}

export interface ShelfPiece {
  // Horizontal slice with depth
  frontEdge: Point3D[];     // Wavy front edge
  backEdge: Point3D[];      // Straight back edge at y=0
  leftSide: [Point3D, Point3D];   // Left side: front-left to back-left
  rightSide: [Point3D, Point3D];  // Right side: front-right to back-right
}

export interface ColumnPiece {
  // Vertical slice with depth
  frontEdge: Point3D[];     // Wavy front edge
  backEdge: Point3D[];      // Straight back edge at y=0
  topSide: [Point3D, Point3D];    // Top: front-top to back-top
  bottomSide: [Point3D, Point3D]; // Bottom: front-bottom to back-bottom
}

export interface ShelfGeometry {
  shelves: ShelfPiece[];
  columns: ColumnPiece[];
  // The five control curves for reference
  curve0: Point3D[];  // x=0: straight line
  curve1: Point3D[];  // x=1/6: first sine
  curve2: Point3D[];  // x=1/2: center (inverted)
  curve3: Point3D[];  // x=5/6: second sine
  curve4: Point3D[];  // x=1: straight line
  // Keep old names for compatibility
  leftCurve: Point3D[];
  centerCurve: Point3D[];
  rightCurve: Point3D[];
}

export function generateShelfGeometry(params: ShelfParams): ShelfGeometry {
  const { width, height, depth, amplitude, shelfCount, columnCount, offset = 0 } = params;

  // Generate the 5 control curves
  const curve0 = generateVerticalSineCurve(0, depth, height, 0, false);              // x=0: straight
  const curve1 = generateVerticalSineCurve(width / 6, depth, height, amplitude, false);      // x=1/6: sine
  const curve2 = generateVerticalSineCurve(width / 2, depth, height, amplitude, true);       // x=1/2: inverted
  const curve3 = generateVerticalSineCurve(width * 5 / 6, depth, height, amplitude, false);  // x=5/6: sine
  const curve4 = generateVerticalSineCurve(width, depth, height, 0, false);          // x=1: straight

  // Keep old names for compatibility
  const leftCurve = curve0;
  const centerCurve = curve2;
  const rightCurve = curve4;

  const shelves: ShelfPiece[] = [];
  const columns: ColumnPiece[] = [];

  // Generate horizontal shelf pieces (slices at different heights)
  // Offset from edges: shelves go from offset to height-offset
  const shelfStartZ = offset;
  const shelfEndZ = height - offset;
  for (let i = 0; i < shelfCount; i++) {
    const t = shelfCount > 1 ? i / (shelfCount - 1) : 0.5;
    const z = shelfStartZ + t * (shelfEndZ - shelfStartZ);

    // Generate wavy front edge at this height
    const frontEdge: Point3D[] = [];
    const backEdge: Point3D[] = [];

    const edgeSegments = 40;
    for (let j = 0; j <= edgeSegments; j++) {
      const x = (j / edgeSegments) * width;
      const yFront = getFrontSurfaceY(x, z, width, height, depth, amplitude);
      frontEdge.push({ x, y: yFront, z });
      backEdge.push({ x, y: 0, z });  // Back edge at y=0 (against wall)
    }

    // Side edges connecting front to back
    const leftSide: [Point3D, Point3D] = [
      frontEdge[0],  // Front-left
      { x: 0, y: 0, z },  // Back-left
    ];
    const rightSide: [Point3D, Point3D] = [
      frontEdge[frontEdge.length - 1],  // Front-right
      { x: width, y: 0, z },  // Back-right
    ];

    shelves.push({
      frontEdge,
      backEdge,
      leftSide,
      rightSide,
    });
  }

  // Generate vertical column pieces (slices at different X positions)
  // Offset from edges: columns go from offset to width-offset
  const colStartX = offset;
  const colEndX = width - offset;
  for (let i = 0; i < columnCount; i++) {
    const t = columnCount > 1 ? i / (columnCount - 1) : 0.5;
    const x = colStartX + t * (colEndX - colStartX);

    // Generate wavy front edge at this X position
    const frontEdge: Point3D[] = [];
    const backEdge: Point3D[] = [];

    const segments = 40;
    for (let j = 0; j <= segments; j++) {
      const z = (j / segments) * height;
      const yFront = getFrontSurfaceY(x, z, width, height, depth, amplitude);
      frontEdge.push({ x, y: yFront, z });
      backEdge.push({ x, y: 0, z });  // Back edge at y=0 (against wall)
    }

    // Top and bottom edges connecting front to back
    const bottomSide: [Point3D, Point3D] = [
      frontEdge[0],  // Front-bottom
      { x, y: 0, z: 0 },  // Back-bottom
    ];
    const topSide: [Point3D, Point3D] = [
      frontEdge[frontEdge.length - 1],  // Front-top
      { x, y: 0, z: height },  // Back-top
    ];

    columns.push({
      frontEdge,
      backEdge,
      topSide,
      bottomSide,
    });
  }

  return { shelves, columns, curve0, curve1, curve2, curve3, curve4, leftCurve, centerCurve, rightCurve };
}

// Projected types
export interface ProjectedShelfGeometry {
  shelves: {
    frontEdge: Point2D[];
    backEdge: Point2D[];
    leftSide: [Point2D, Point2D];
    rightSide: [Point2D, Point2D];
  }[];
  columns: {
    frontEdge: Point2D[];
    backEdge: Point2D[];
    topSide: [Point2D, Point2D];
    bottomSide: [Point2D, Point2D];
  }[];
  // All 5 control curves
  curve0: Point2D[];
  curve1: Point2D[];
  curve2: Point2D[];
  curve3: Point2D[];
  curve4: Point2D[];
  leftCurve: Point2D[];
  centerCurve: Point2D[];
  rightCurve: Point2D[];
}

export function projectGeometry(geo: ShelfGeometry): ProjectedShelfGeometry {
  return {
    shelves: geo.shelves.map(s => ({
      frontEdge: s.frontEdge.map(isometricProject),
      backEdge: s.backEdge.map(isometricProject),
      leftSide: [isometricProject(s.leftSide[0]), isometricProject(s.leftSide[1])] as [Point2D, Point2D],
      rightSide: [isometricProject(s.rightSide[0]), isometricProject(s.rightSide[1])] as [Point2D, Point2D],
    })),
    columns: geo.columns.map(c => ({
      frontEdge: c.frontEdge.map(isometricProject),
      backEdge: c.backEdge.map(isometricProject),
      topSide: [isometricProject(c.topSide[0]), isometricProject(c.topSide[1])] as [Point2D, Point2D],
      bottomSide: [isometricProject(c.bottomSide[0]), isometricProject(c.bottomSide[1])] as [Point2D, Point2D],
    })),
    curve0: geo.curve0.map(isometricProject),
    curve1: geo.curve1.map(isometricProject),
    curve2: geo.curve2.map(isometricProject),
    curve3: geo.curve3.map(isometricProject),
    curve4: geo.curve4.map(isometricProject),
    leftCurve: geo.leftCurve.map(isometricProject),
    centerCurve: geo.centerCurve.map(isometricProject),
    rightCurve: geo.rightCurve.map(isometricProject),
  };
}

export function projectGeometryWithRotation(
  geo: ShelfGeometry,
  angle: number,
  width: number,
  height: number
): ProjectedShelfGeometry {
  // Center of rotation (middle of the object)
  const centerX = width / 2;
  const centerY = 10; // Approximate center depth

  const project = (p: Point3D) => rotateAndProject(p, angle, centerX, centerY);

  return {
    shelves: geo.shelves.map(s => ({
      frontEdge: s.frontEdge.map(project),
      backEdge: s.backEdge.map(project),
      leftSide: [project(s.leftSide[0]), project(s.leftSide[1])] as [Point2D, Point2D],
      rightSide: [project(s.rightSide[0]), project(s.rightSide[1])] as [Point2D, Point2D],
    })),
    columns: geo.columns.map(c => ({
      frontEdge: c.frontEdge.map(project),
      backEdge: c.backEdge.map(project),
      topSide: [project(c.topSide[0]), project(c.topSide[1])] as [Point2D, Point2D],
      bottomSide: [project(c.bottomSide[0]), project(c.bottomSide[1])] as [Point2D, Point2D],
    })),
    curve0: geo.curve0.map(project),
    curve1: geo.curve1.map(project),
    curve2: geo.curve2.map(project),
    curve3: geo.curve3.map(project),
    curve4: geo.curve4.map(project),
    leftCurve: geo.leftCurve.map(project),
    centerCurve: geo.centerCurve.map(project),
    rightCurve: geo.rightCurve.map(project),
  };
}

export function pointsToPath(points: Point2D[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
  ).join(' ');
}

export function calculateBounds(projected: ProjectedShelfGeometry): {
  minX: number; maxX: number; minY: number; maxY: number;
} {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  const update = (p: Point2D) => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  };

  projected.shelves.forEach(s => {
    s.frontEdge.forEach(update);
    s.backEdge.forEach(update);
    update(s.leftSide[0]);
    update(s.leftSide[1]);
    update(s.rightSide[0]);
    update(s.rightSide[1]);
  });
  projected.columns.forEach(c => {
    c.frontEdge.forEach(update);
    c.backEdge.forEach(update);
    update(c.topSide[0]);
    update(c.topSide[1]);
    update(c.bottomSide[0]);
    update(c.bottomSide[1]);
  });

  return { minX, maxX, minY, maxY };
}
