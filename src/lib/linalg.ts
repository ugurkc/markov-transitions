export type Matrix = number[][]
export type Vector = number[]

export function identity(n: number): Matrix {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  )
}

export function matMul(a: Matrix, b: Matrix): Matrix {
  const n = a.length
  const k = b.length
  const m = b[0].length
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: m }, (_, j) => {
      let s = 0
      for (let x = 0; x < k; x++) s += a[i][x] * b[x][j]
      return s
    }),
  )
}

export function vecMat(v: Vector, p: Matrix): Vector {
  return p[0].map((_, j) => v.reduce((s, vi, i) => s + vi * p[i][j], 0))
}

/** Gauss–Jordan inversion with partial pivoting. Throws on singular input. */
export function invert(m: Matrix): Matrix {
  const n = m.length
  const I = identity(n)
  const a = m.map((row, i) => [...row, ...I[i]])
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[piv][col])) piv = r
    }
    if (Math.abs(a[piv][col]) < 1e-12) throw new Error('Matrix is singular')
    ;[a[col], a[piv]] = [a[piv], a[col]]
    const p = a[col][col]
    for (let j = 0; j < 2 * n; j++) a[col][j] /= p
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = a[r][col]
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[col][j]
    }
  }
  return a.map((row) => row.slice(n))
}
