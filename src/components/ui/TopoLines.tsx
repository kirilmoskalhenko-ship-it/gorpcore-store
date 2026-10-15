/** Тонкие топографические изолинии — декоративная графика в цвет акцента. */
export function TopoLines({ className = "", rings = 9 }: { className?: string; rings?: number }) {
  const paths = Array.from({ length: rings }, (_, i) => {
    const k = 1 + i * 0.32;
    const wob = 6 + i * 1.4;
    // замкнутая «живая» кривая вокруг центра
    const n = 12;
    const pts = Array.from({ length: n }, (_, j): [number, number] => {
      const a = (j / n) * Math.PI * 2;
      const r = 40 * k + Math.sin(a * 3 + i * 0.7) * wob + Math.cos(a * 5 - i) * wob * 0.5;
      return [300 + Math.cos(a) * r * 1.35, 300 + Math.sin(a) * r];
    });
    const mid = (a: [number, number], b: [number, number]) => `${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)}`;
    let d = `M${mid(pts[n - 1]!, pts[0]!)}`;
    for (let j = 0; j < n; j++) {
      const p = pts[j]!;
      d += ` Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${mid(p, pts[(j + 1) % n]!)}`;
    }
    return <path key={i} d={`${d} Z`} />;
  });
  return (
    <svg
      viewBox="0 0 600 600"
      aria-hidden
      className={`pointer-events-none fill-none stroke-moss ${className}`}
      strokeWidth={0.8}
      vectorEffect="non-scaling-stroke"
    >
      {paths}
    </svg>
  );
}
