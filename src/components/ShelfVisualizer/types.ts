export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface ShelfParams {
  width: number;      // Distance from left wall out (X extent)
  length: number;     // Distance from back wall out (Y extent)
  depth: number;      // Offset of center curve at 45° (shelf depth)
  height: number;     // Total height (Z extent)
  amplitude: number;  // Sine wave amplitude
  shelfCount: number; // Number of horizontal shelves
  columnCount: number; // Number of vertical columns per curve
  offset: number;     // Distance from edges before slicing begins
}

export interface ShelfGeometry {
  shelves: ShelfLevel[];
  columns: Column[];
}

export interface ShelfLevel {
  z: number;
  leftCurve: Point3D[];
  centerCurve: Point3D[];
  backCurve: Point3D[];
}

export interface Column {
  points: Point3D[]; // Top and bottom points for each column
}

export interface ProjectedGeometry {
  shelves: ProjectedShelfLevel[];
  columns: ProjectedColumn[];
}

export interface ProjectedShelfLevel {
  leftCurve: Point2D[];
  centerCurve: Point2D[];
  backCurve: Point2D[];
}

export interface ProjectedColumn {
  start: Point2D;
  end: Point2D;
}
