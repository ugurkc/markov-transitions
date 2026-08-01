export interface Pt {
  x: number
  y: number
}

/** A node's box in flow coordinates, described from its center. */
export interface Rect {
  cx: number
  cy: number
  w: number
  h: number
}

export type EdgeGeom =
  | { kind: 'line'; a: Pt; b: Pt }
  | { kind: 'quad'; a: Pt; c: Pt; b: Pt }
  | { kind: 'cubic'; a: Pt; c1: Pt; c2: Pt; b: Pt }

export interface EdgeGeomOptions {
  selfLoop: boolean
  /** True when a transition in the opposite direction also exists. */
  hasReverse: boolean
  /**
   * Where the path starts and stops. Edges stop at the node border so the
   * arrowhead lands cleanly; travelling players run centre-to-centre so they
   * are seen arriving *inside* the destination rather than winking out at
   * its edge. Defaults to `'border'`.
   */
  endpoints?: 'border' | 'center'
}

const SELF_LOOP_RADIUS = 44
const BOW = 26
const BORDER_PAD = 3

/** Point where a ray from the rect's center toward (tx, ty) exits the rect. */
export function borderPoint(rect: Rect, tx: number, ty: number, pad = BORDER_PAD): Pt {
  const dx = tx - rect.cx
  const dy = ty - rect.cy
  const scale = Math.max(
    Math.abs(dx) / (rect.w / 2 + pad),
    Math.abs(dy) / (rect.h / 2 + pad),
  )
  if (scale === 0) return { x: rect.cx, y: rect.cy }
  return { x: rect.cx + dx / scale, y: rect.cy + dy / scale }
}

/**
 * Geometry for one transition, shared by the rendered edge and the simulation
 * overlay so animated players travel along exactly the curve that is drawn.
 *
 * Edges float: they attach wherever the two node borders face each other,
 * rather than through fixed handles. Bidirectional pairs each bow to the right
 * of their own direction of travel, separating into a lens; self-loops arc off
 * the node's right side.
 */
export function edgeGeometry(s: Rect, t: Rect, opts: EdgeGeomOptions): EdgeGeom {
  const toCenter = opts.endpoints === 'center'

  if (opts.selfLoop) {
    const x = s.cx + s.w / 2
    const r = SELF_LOOP_RADIUS
    return {
      kind: 'cubic',
      a: toCenter ? { x: s.cx, y: s.cy } : { x, y: s.cy - 9 },
      c1: { x: x + r, y: s.cy - r * 0.9 },
      c2: { x: x + r, y: s.cy + r * 0.9 },
      b: toCenter ? { x: s.cx, y: s.cy } : { x, y: s.cy + 9 },
    }
  }

  const a = toCenter ? { x: s.cx, y: s.cy } : borderPoint(s, t.cx, t.cy)
  const b = toCenter ? { x: t.cx, y: t.cy } : borderPoint(t, s.cx, s.cy)

  if (!opts.hasReverse) return { kind: 'line', a, b }

  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  return {
    kind: 'quad',
    a,
    // Control point at twice the bow so the curve's apex lands exactly one
    // bow-width off the chord — where the probability label sits.
    c: { x: (a.x + b.x) / 2 + nx * BOW * 2, y: (a.y + b.y) / 2 + ny * BOW * 2 },
    b,
  }
}

export function pathD(g: EdgeGeom): string {
  switch (g.kind) {
    case 'line':
      return `M ${g.a.x} ${g.a.y} L ${g.b.x} ${g.b.y}`
    case 'quad':
      return `M ${g.a.x} ${g.a.y} Q ${g.c.x} ${g.c.y} ${g.b.x} ${g.b.y}`
    case 'cubic':
      return `M ${g.a.x} ${g.a.y} C ${g.c1.x} ${g.c1.y}, ${g.c2.x} ${g.c2.y}, ${g.b.x} ${g.b.y}`
  }
}

/** Position along the geometry at parameter `t` in [0, 1]. */
export function pointAt(g: EdgeGeom, t: number): Pt {
  const u = 1 - t
  switch (g.kind) {
    case 'line':
      return { x: g.a.x + (g.b.x - g.a.x) * t, y: g.a.y + (g.b.y - g.a.y) * t }
    case 'quad':
      return {
        x: u * u * g.a.x + 2 * u * t * g.c.x + t * t * g.b.x,
        y: u * u * g.a.y + 2 * u * t * g.c.y + t * t * g.b.y,
      }
    case 'cubic':
      return {
        x:
          u * u * u * g.a.x +
          3 * u * u * t * g.c1.x +
          3 * u * t * t * g.c2.x +
          t * t * t * g.b.x,
        y:
          u * u * u * g.a.y +
          3 * u * u * t * g.c1.y +
          3 * u * t * t * g.c2.y +
          t * t * t * g.b.y,
      }
  }
}
