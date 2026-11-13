/** Presentation-only terrain for the synthetic namespace. Never a source of canon coordinates. */
export function elevation(x: number, y: number): number {
  const peak = (cx: number, cy: number, sx: number, sy: number, h: number) => h * Math.exp(-(((x - cx) / sx) ** 2) - ((y - cy) / sy) ** 2);
  return peak(520, 210, 210, 150, 125) + peak(730, 430, 200, 160, 95) + peak(230, 180, 140, 170, 70) + 10 * Math.sin(x / 75) * Math.cos(y / 90) - 12;
}
export function contours(): { level: number; path: string }[] {
  const result: { level: number; path: string }[] = [];
  const step = 12;
  for (let level = 0; level <= 120; level += 6) {
    let path = '';
    for (let x = 0; x < 1000; x += step) for (let y = 0; y < 660; y += step) {
      const corners = [[x, y], [x + step, y], [x + step, y + step], [x, y + step]];
      const crossings: number[][] = [];
      for (let edge = 0; edge < 4; edge++) {
        const a = corners[edge], b = corners[(edge + 1) % 4];
        const va = elevation(a[0], a[1]), vb = elevation(b[0], b[1]);
        if ((va < level) !== (vb < level)) {
          const ratio = (level - va) / (vb - va);
          crossings.push([a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio]);
        }
      }
      for (let i = 0; i + 1 < crossings.length; i += 2) path += `M${crossings[i][0].toFixed(1)},${crossings[i][1].toFixed(1)}L${crossings[i + 1][0].toFixed(1)},${crossings[i + 1][1].toFixed(1)}`;
    }
    result.push({ level, path });
  }
  return result;
}
