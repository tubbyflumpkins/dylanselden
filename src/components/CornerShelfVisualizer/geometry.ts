import { Point3D, Point2D, CornerShelfParams } from './types';

/**
 * CORNER SHELF GENERATOR
 *
 * Creates a shelf that fits into a 90-degree corner. The surface wraps from
 * the X-axis wall to the Y-axis wall with a wavy front surface.
 *
 * 5 control curves positioned around the corner:
 * - curve0: (0, length) - straight line on Y-axis wall
 * - curve1: (depth, length-depth) - sine curve
 * - curve2: (depth, depth) - inverted sine curve (center, at 45°)
 * - curve3: (width-depth, depth) - sine curve
 * - curve4: (width, 0) - straight line on X-axis wall
 *
 * The sine waves push the surface outward from the corner (along 45° diagonal).
 */

// Isometric projection
const ISO_ANGLE = Math.PI / 6;
const COS_ISO = Math.cos(ISO_ANGLE);
const SIN_ISO = Math.sin(ISO_ANGLE);

// Diagonal direction for sine wave offset (normalized)
const DIAG = 1 / Math.sqrt(2);

export function isometricProject(p: Point3D): Point2D {
  return {
    x: (p.x - p.y) * COS_ISO,
    y: -p.z + (p.x + p.y) * SIN_ISO * 0.5,
  };
}

export function rotateAndProject(p: Point3D, angle: number, centerX: number, centerY: number): Point2D {
  const x = p.x - centerX;
  const y = p.y - centerY;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const rotatedX = x * cosA - y * sinA;
  const rotatedY = x * sinA + y * cosA;
  return isometricProject({
    x: rotatedX + centerX,
    y: rotatedY + centerY,
    z: p.z,
  });
}

/**
 * Generate a vertical sine curve at position (baseX, baseY)
 * The sine wave affects position along the outward direction (dirX, dirY)
 */
function generateCornerVerticalSineCurve(
  baseX: number,
  baseY: number,
  dirX: number,
  dirY: number,
  height: number,
  amplitude: number,
  inverted: boolean,
  segments: number = 40
): Point3D[] {
  const points: Point3D[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const z = t * height;
    const sineValue = Math.sin(t * Math.PI * 2);
    const offset = inverted ? -amplitude * sineValue : amplitude * sineValue;
    points.push({
      x: baseX + offset * dirX,
      y: baseY + offset * dirY,
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
 * Catmull-Rom spline interpolation between 4 points
 * Returns the interpolated value at parameter t (0 to 1) between p1 and p2
 * p0 and p3 are used to calculate tangents for smooth continuity
 */
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

/**
 * Interpolate between 5 values using Catmull-Rom spline
 * This creates a truly smooth curve with continuous first derivatives
 * Values are at positions: 0, 1/6, 1/2, 5/6, 1
 */
function interpolate5Smooth(
  t: number,
  v0: number,  // t=0
  v1: number,  // t=1/6
  v2: number,  // t=1/2
  v3: number,  // t=5/6
  v4: number   // t=1
): number {
  // Clamp t to valid range
  t = Math.max(0, Math.min(1, t));

  // Define segment boundaries
  const t1 = 1/6;
  const t2 = 1/2;
  const t3 = 5/6;

  if (t <= t1) {
    // First segment: between v0 and v1
    // Extrapolate a point before v0 for smooth start
    const v_before = v0 + (v0 - v1);  // Mirror v1 across v0
    const localT = t / t1;
    return catmullRom(v_before, v0, v1, v2, localT);
  } else if (t <= t2) {
    // Second segment: between v1 and v2
    const localT = (t - t1) / (t2 - t1);
    return catmullRom(v0, v1, v2, v3, localT);
  } else if (t <= t3) {
    // Third segment: between v2 and v3
    const localT = (t - t2) / (t3 - t2);
    return catmullRom(v1, v2, v3, v4, localT);
  } else {
    // Fourth segment: between v3 and v4
    // Extrapolate a point after v4 for smooth end
    const v_after = v4 + (v4 - v3);  // Mirror v3 across v4
    const localT = (t - t3) / (1 - t3);
    return catmullRom(v2, v3, v4, v_after, localT);
  }
}

/**
 * Get curve base positions (without sine offset)
 */
function getCurveBasePositions(params: CornerShelfParams): { x: number; y: number }[] {
  const { width, length, depth } = params;
  return [
    { x: width, y: 0 },           // curve4: t=0
    { x: width - depth, y: depth }, // curve3: t=1/6
    { x: depth, y: depth },       // curve2: t=1/2
    { x: depth, y: length - depth }, // curve1: t=5/6
    { x: 0, y: length },          // curve0: t=1
  ];
}

/**
 * Get the front surface position at path parameter t and height z
 *
 * KEY INSIGHT: We interpolate the AMPLITUDE EFFECT separately from the BASE PATH.
 * This creates smooth wavy transitions, not point-to-point connections.
 *
 * 1. Calculate the base spine (smooth curve without any wave)
 * 2. Interpolate the amplitude multipliers (0, +1, -1, +1, 0)
 * 3. Apply the blended amplitude offset along the outward direction
 */
function getCornerFrontSurface(
  t: number,
  z: number,
  params: CornerShelfParams
): { x: number; y: number } {
  const { width, length, depth, height, amplitude } = params;
  const sineValue = Math.sin((z / height) * Math.PI * 2);

  // 1. Calculate the base spine position using SMOOTH Catmull-Rom interpolation
  //    This creates a truly smooth curve through the control points
  const baseX = interpolate5Smooth(t,
    width,                    // curve4 at t=0
    width - depth * 2/3,      // curve3 at t=1/6 (moved closer to edge)
    depth,                    // curve2 at t=1/2
    depth,                    // curve1 at t=5/6
    0                         // curve0 at t=1
  );

  const baseY = interpolate5Smooth(t,
    0,                        // curve4 at t=0
    depth,                    // curve3 at t=1/6
    depth,                    // curve2 at t=1/2
    length - depth * 2/3,     // curve1 at t=5/6 (moved closer to edge)
    length                    // curve0 at t=1
  );

  // 2. Interpolate the amplitude MULTIPLIERS using smooth interpolation
  //    curve4: 0 (straight edge, no wave)
  //    curve3: +1 (normal sine)
  //    curve2: -1 (inverted sine)
  //    curve1: +1 (normal sine)
  //    curve0: 0 (straight edge, no wave)
  const ampMultiplier = interpolate5Smooth(t, 0, 1, -1, 1, 0);

  // 3. Calculate the offset and apply along outward diagonal direction
  const offset = amplitude * sineValue * ampMultiplier;

  return {
    x: baseX + offset * DIAG,
    y: baseY + offset * DIAG,
  };
}

export interface CornerShelfPiece {
  frontEdge: Point3D[];       // Wavy front edge
  backEdgeX: Point3D[];       // Back edge along y=0 (from width,0 to 0,0)
  backEdgeY: Point3D[];       // Back edge along x=0 (from 0,0 to 0,length)
  widthSide: [Point3D, Point3D];   // Connects front to (width, 0)
  lengthSide: [Point3D, Point3D];  // Connects front to (0, length)
}

export interface CornerColumnPiece {
  frontEdge: Point3D[];       // Wavy front edge (vertical)
  backEdge: Point3D[];        // Back edge (vertical, on corner walls)
  topSide: [Point3D, Point3D];
  bottomSide: [Point3D, Point3D];
}

export interface CornerShelfGeometry {
  shelves: CornerShelfPiece[];
  columns: CornerColumnPiece[];
  curves: Point3D[][];  // The 5 control curves
  surfaceContours: Point3D[][];  // Horizontal contour lines showing the lofted surface
}

/**
 * For a 45° slice at x - y = k (radiating outward from origin at 45°),
 * find where it intersects the corner walls.
 *
 * Line x - y = k:
 * - Intersects y=0 (x-axis wall) at x = k, so point (k, 0)
 * - Intersects x=0 (y-axis wall) at y = -k, so point (0, -k)
 *
 * For positive k: the line goes through (k, 0) and extends toward positive x, positive y
 * For negative k: the line goes through (0, -k) = (0, |k|) and extends similarly
 */
function getBackPointFor45Slice(k: number, width: number, length: number): { x: number; y: number } {
  // Line x - y = k
  // At y=0: x = k (intersects x-axis wall)
  // At x=0: y = -k (intersects y-axis wall)

  if (k >= 0) {
    // Line hits x-axis wall at (k, 0) if k <= width
    if (k <= width) {
      return { x: k, y: 0 };
    }
    // Otherwise clamp to corner
    return { x: width, y: 0 };
  } else {
    // k < 0, so -k > 0
    // Line hits y-axis wall at (0, -k)
    const yIntercept = -k;
    if (yIntercept <= length) {
      return { x: 0, y: yIntercept };
    }
    // Otherwise clamp to corner
    return { x: 0, y: length };
  }
}

export function generateCornerShelfGeometry(params: CornerShelfParams): CornerShelfGeometry {
  const { width, length, height, depth, shelfCount, columnCount, shelfOffset = 0, columnOffset = 0 } = params;

  // Generate the 5 control curves for visualization
  const curveData = [
    { baseX: width, baseY: 0, dirX: 0, dirY: 1, amp: 0, inv: false },           // curve4
    { baseX: width - depth * 2/3, baseY: depth, dirX: DIAG, dirY: DIAG, amp: params.amplitude, inv: false }, // curve3 (moved closer to edge)
    { baseX: depth, baseY: depth, dirX: DIAG, dirY: DIAG, amp: params.amplitude, inv: true },  // curve2
    { baseX: depth, baseY: length - depth * 2/3, dirX: DIAG, dirY: DIAG, amp: params.amplitude, inv: false }, // curve1 (moved closer to edge)
    { baseX: 0, baseY: length, dirX: 1, dirY: 0, amp: 0, inv: false },          // curve0
  ];

  const curves = curveData.map(c =>
    generateCornerVerticalSineCurve(c.baseX, c.baseY, c.dirX, c.dirY, height, c.amp, c.inv)
  );

  // Generate surface contour lines (horizontal slices showing the lofted surface)
  const surfaceContours: Point3D[][] = [];
  const numContours = 30;  // Number of horizontal contour lines
  for (let i = 0; i <= numContours; i++) {
    const z = (i / numContours) * height;
    const contour: Point3D[] = [];
    const segments = 80;
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const pos = getCornerFrontSurface(t, z, params);
      contour.push({ x: pos.x, y: pos.y, z });
    }
    surfaceContours.push(contour);
  }

  const shelves: CornerShelfPiece[] = [];
  const columns: CornerColumnPiece[] = [];

  // Generate horizontal shelf pieces
  const shelfStartZ = shelfOffset;
  const shelfEndZ = height - shelfOffset;

  for (let i = 0; i < shelfCount; i++) {
    const tZ = shelfCount > 1 ? i / (shelfCount - 1) : 0.5;
    const z = shelfStartZ + tZ * (shelfEndZ - shelfStartZ);

    // Generate wavy front edge by sampling along path parameter
    const frontEdge: Point3D[] = [];
    const segments = 80;  // More segments for smoother curve
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const pos = getCornerFrontSurface(t, z, params);
      frontEdge.push({ x: pos.x, y: pos.y, z });
    }

    // Back edge along y=0 (from width,0 to 0,0)
    const backEdgeX: Point3D[] = [];
    const backSegmentsX = 20;
    for (let j = 0; j <= backSegmentsX; j++) {
      const x = width * (1 - j / backSegmentsX);
      backEdgeX.push({ x, y: 0, z });
    }

    // Back edge along x=0 (from 0,0 to 0,length)
    const backEdgeY: Point3D[] = [];
    const backSegmentsY = 20;
    for (let j = 0; j <= backSegmentsY; j++) {
      const y = length * (j / backSegmentsY);
      backEdgeY.push({ x: 0, y, z });
    }

    // Side connections
    const widthSide: [Point3D, Point3D] = [
      frontEdge[0],
      { x: width, y: 0, z },
    ];
    const lengthSide: [Point3D, Point3D] = [
      frontEdge[frontEdge.length - 1],
      { x: 0, y: length, z },
    ];

    shelves.push({ frontEdge, backEdgeX, backEdgeY, widthSide, lengthSide });
  }

  // Generate vertical column pieces - PARALLEL at 45° angle radiating from origin
  // Columns are slices where x - y = k (constant)
  // This creates columns parallel to the (1,1) direction (45° from origin outward)

  // Sample the surface at z=height/2 to get the range of x-y values
  const sampleZ = height / 2;
  const startPos = getCornerFrontSurface(0, sampleZ, params);
  const endPos = getCornerFrontSurface(1, sampleZ, params);

  // k ranges from startPos.x - startPos.y to endPos.x - endPos.y
  // At t=0 (width side): x=width, y≈0, so k ≈ width (positive)
  // At t=1 (length side): x≈0, y=length, so k ≈ -length (negative)
  const kStart = startPos.x - startPos.y;  // positive (width side)
  const kEnd = endPos.x - endPos.y;        // negative (length side)

  // Apply columnOffset - reduce the range slightly
  const kMin = Math.min(kStart, kEnd) + columnOffset;
  const kMax = Math.max(kStart, kEnd) - columnOffset;

  for (let i = 0; i < columnCount; i++) {
    const tCol = columnCount > 1 ? i / (columnCount - 1) : 0.5;
    const k = kMax + tCol * (kMin - kMax);  // Go from kMax (width side) to kMin (length side)

    // Find the path parameter t where the surface intersects x - y = k
    // This varies with z, so we'll trace the column vertically

    const frontEdge: Point3D[] = [];
    const backEdge: Point3D[] = [];
    const segments = 40;

    for (let j = 0; j <= segments; j++) {
      const z = (j / segments) * height;

      // Binary search to find t where x - y = k at this height
      let tLow = 0, tHigh = 1;
      let tMid = 0.5;

      for (let iter = 0; iter < 20; iter++) {
        tMid = (tLow + tHigh) / 2;
        const pos = getCornerFrontSurface(tMid, z, params);
        const diff = pos.x - pos.y;

        // x-y decreases as t goes from 0 to 1 (from width side to length side)
        if (diff > k) {
          tLow = tMid;
        } else {
          tHigh = tMid;
        }
      }

      const frontPos = getCornerFrontSurface(tMid, z, params);
      frontEdge.push({ x: frontPos.x, y: frontPos.y, z });

      // Back edge: where x - y = k meets the corner walls
      const backPos = getBackPointFor45Slice(k, width, length);
      backEdge.push({ x: backPos.x, y: backPos.y, z });
    }

    const bottomSide: [Point3D, Point3D] = [
      frontEdge[0],
      backEdge[0],
    ];
    const topSide: [Point3D, Point3D] = [
      frontEdge[frontEdge.length - 1],
      backEdge[backEdge.length - 1],
    ];

    columns.push({ frontEdge, backEdge, topSide, bottomSide });
  }

  return { shelves, columns, curves, surfaceContours };
}

// Projected types
export interface ProjectedCornerShelfGeometry {
  shelves: {
    frontEdge: Point2D[];
    backEdgeX: Point2D[];
    backEdgeY: Point2D[];
    widthSide: [Point2D, Point2D];
    lengthSide: [Point2D, Point2D];
  }[];
  columns: {
    frontEdge: Point2D[];
    backEdge: Point2D[];
    topSide: [Point2D, Point2D];
    bottomSide: [Point2D, Point2D];
  }[];
  curves: Point2D[][];
  surfaceContours: Point2D[][];
}

export function projectCornerGeometryWithRotation(
  geo: CornerShelfGeometry,
  angle: number,
  width: number,
  length: number
): ProjectedCornerShelfGeometry {
  const centerX = width / 2;
  const centerY = length / 2;

  const project = (p: Point3D) => rotateAndProject(p, angle, centerX, centerY);

  return {
    shelves: geo.shelves.map(s => ({
      frontEdge: s.frontEdge.map(project),
      backEdgeX: s.backEdgeX.map(project),
      backEdgeY: s.backEdgeY.map(project),
      widthSide: [project(s.widthSide[0]), project(s.widthSide[1])] as [Point2D, Point2D],
      lengthSide: [project(s.lengthSide[0]), project(s.lengthSide[1])] as [Point2D, Point2D],
    })),
    columns: geo.columns.map(c => ({
      frontEdge: c.frontEdge.map(project),
      backEdge: c.backEdge.map(project),
      topSide: [project(c.topSide[0]), project(c.topSide[1])] as [Point2D, Point2D],
      bottomSide: [project(c.bottomSide[0]), project(c.bottomSide[1])] as [Point2D, Point2D],
    })),
    curves: geo.curves.map(curve => curve.map(project)),
    surfaceContours: geo.surfaceContours.map(contour => contour.map(project)),
  };
}

export function pointsToPath(points: Point2D[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
  ).join(' ');
}

export function calculateBounds(projected: ProjectedCornerShelfGeometry): {
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
    s.backEdgeX.forEach(update);
    s.backEdgeY.forEach(update);
    update(s.widthSide[0]);
    update(s.widthSide[1]);
    update(s.lengthSide[0]);
    update(s.lengthSide[1]);
  });
  projected.columns.forEach(c => {
    c.frontEdge.forEach(update);
    c.backEdge.forEach(update);
    update(c.topSide[0]);
    update(c.topSide[1]);
    update(c.bottomSide[0]);
    update(c.bottomSide[1]);
  });
  projected.surfaceContours.forEach(contour => {
    contour.forEach(update);
  });

  return { minX, maxX, minY, maxY };
}
