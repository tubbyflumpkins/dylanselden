export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface CornerShelfParams {
  width: number;        // Distance along X-axis to right edge
  length: number;       // Distance along Y-axis to left edge
  depth: number;        // How far sine curves protrude from corner
  height: number;       // Total height (Z extent)
  amplitude: number;    // Sine wave amplitude
  shelfCount: number;   // Number of horizontal shelves
  columnCount: number;  // Number of vertical columns
  shelfOffset: number;  // Distance from top/bottom before shelf slicing begins
  columnOffset: number; // Distance from sides before column slicing begins
  wallAlign: number;    // Wall alignment: 0 = 45° (mirror), 1 = 90° (perpendicular)
}
