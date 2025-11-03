// SwarmJS Geometry Utilities
// Adapted from SwarmJS/src/common/utils/geometry.js for TypeScript

export interface Point {
  x: number;
  y: number;
}

export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function normalizeAngle(angle: number): number {
  return angle % (2 * Math.PI);
}

export function normalizeAnglePlusMinusPi(a: number): number {
  while (a > Math.PI) {
    a -= 2 * Math.PI;
  }
  while (a <= -Math.PI) {
    a += 2 * Math.PI;
  }
  return a;
}

export function getAngularDifference(angleA: number, angleB: number): number {
  angleA = normalizeAnglePlusMinusPi(angleA);
  angleB = normalizeAnglePlusMinusPi(angleB);
  let error = Math.abs(angleA - angleB);
  if (error > Math.PI) {
    error -= Math.PI * 2;
    error = Math.abs(error);
  }
  return error;
}

export function getPointFromDistanceAndAngle(length: number, angle: number): Point {
  return {
    x: length * Math.cos(angle),
    y: length * Math.sin(angle)
  };
}

export function getAbsolutePointFromRelativePoint(center: Point, point: Point): Point {
  return {
    x: point.x + center.x,
    y: point.y + center.y
  };
}

export function getDistance(pos1: Point, pos2: Point): number {
  return Math.sqrt(
    (pos1.x - pos2.x) * (pos1.x - pos2.x) + (pos1.y - pos2.y) * (pos1.y - pos2.y)
  );
}

export function dotProduct(vec1: Point, vec2: Point): number {
  return vec1.x * vec2.x + vec1.y * vec2.y;
}

export function closestPointInLineSegToPoint(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): Point {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx;
  let yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  return { x: xx, y: yy };
}

export function pointIsInsidePolygon(point: Point, polygon: number[][]): boolean {
  const { x, y } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

export function circleIntersectsPolygon(
  point: Point,
  radius: number,
  polygon: number[][]
): boolean {
  if (pointIsInsidePolygon(point, polygon)) {
    return true;
  }

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const v = { x: polygon[i][0], y: polygon[i][1] };
    const w = { x: polygon[j][0], y: polygon[j][1] };
    if (distToSegment(point, v, w) < radius) {
      return true;
    }
  }

  return false;
}

function sqr(x: number): number {
  return x * x;
}

function dist2(v: Point, w: Point): number {
  return sqr(v.x - w.x) + sqr(v.y - w.y);
}

function distToSegmentSquared(p: Point, v: Point, w: Point): number {
  const l2 = dist2(v, w);
  if (l2 === 0) return dist2(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist2(p, {
    x: v.x + t * (w.x - v.x),
    y: v.y + t * (w.y - v.y)
  });
}

function distToSegment(p: Point, v: Point, w: Point): number {
  return Math.sqrt(distToSegmentSquared(p, v, w));
}

