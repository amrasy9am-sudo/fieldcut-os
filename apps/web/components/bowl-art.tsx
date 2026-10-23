import type { ProteinKind } from "@/lib/menu";

const PROTEIN: Record<ProteinKind, { fill: string; stroke: string }> = {
  chicken: { fill: "#C88845", stroke: "#7A4A1F" },
  teriyaki: { fill: "#7E4320", stroke: "#4A2410" },
  salmon: { fill: "#F08A5D", stroke: "#C9643B" },
  egg: { fill: "#6FAE38", stroke: "#4E8A22" },
};

const LEAVES = [
  [70, 70, 20], [110, 60, 140], [140, 95, 60], [80, 120, 100], [120, 135, 30],
  [55, 100, 160], [100, 95, 80], [150, 130, 120], [65, 145, 50], [130, 50, 10],
];

/** A simple illustrated top-down salad bowl, drawn in SVG so it loads instantly. */
export function BowlArt({
  protein,
  size = 120,
  className,
}: {
  protein: ProteinKind;
  size?: number;
  className?: string;
}) {
  const p = PROTEIN[protein];
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true" className={className}>
      <circle cx="100" cy="100" r="95" fill="#C8A678" />
      <circle cx="100" cy="100" r="86" fill="#AF8B5C" />
      <circle cx="100" cy="100" r="81" fill="#4E8A35" />
      {LEAVES.map(([x, y, r], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx="22"
          ry="12"
          transform={`rotate(${r} ${x} ${y})`}
          fill={i % 2 ? "#8EC75B" : "#7DB84F"}
        />
      ))}
      {[[70, 42], [96, 34], [122, 40]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="11" fill="#E4F2C9" stroke="#4F8F35" strokeWidth="3" />
      ))}
      {[[45, 105], [62, 142]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="7.5" fill="#D9432F" />
      ))}
      {[[90, 80], [104, 118], [76, 98]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y} l10 6`} stroke="#EE8A2E" strokeWidth="3.4" strokeLinecap="round" />
      ))}
      {protein === "salmon" ? (
        <rect x="108" y="82" width="62" height="34" rx="12" fill={p.fill} stroke={p.stroke}
          transform="rotate(-25 139 99)" />
      ) : protein === "egg" ? (
        [[128, 92], [150, 116], [120, 128]].map(([x, y], i) => (
          <g key={i}>
            <ellipse cx={x} cy={y} rx="14" ry="11" fill="#FBF8EF" stroke="#E3DCC9" />
            <circle cx={x + 1} cy={y} r="6.2" fill="#F2B33D" />
          </g>
        ))
      ) : (
        [[125, 80], [146, 94], [128, 108], [150, 120], [130, 134], [112, 96]].map(([x, y], i) => (
          <rect key={i} x={x - 9} y={y - 7} width="18" height="14" rx="4" fill={p.fill} stroke={p.stroke} />
        ))
      )}
      {protein !== "egg" && (
        <g>
          <ellipse cx="72" cy="156" rx="14" ry="11" fill="#FBF8EF" stroke="#E3DCC9" />
          <circle cx="73" cy="156" r="6.2" fill="#F2B33D" />
        </g>
      )}
    </svg>
  );
}
