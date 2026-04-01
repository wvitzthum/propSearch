import React, { useMemo } from 'react';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  showArea?: boolean;
  showDot?: boolean;
  dotIndex?: number;
  thresholds?: { above: number; below: number };
  className?: string;
}

const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width = 80,
  height = 32,
  color = '#3b82f6',
  fillColor,
  showArea = true,
  showDot = false,
  dotIndex,
  className = '',
}) => {
  const points = useMemo(() => {
    if (!data.length) return { line: '', area: '', dotX: 0, dotY: 0 };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = 2;
    const effectiveHeight = height - pad * 2;
    const stepX = (width - pad * 2) / (data.length - 1 || 1);

    const coords = data.map((v, i) => ({
      x: pad + i * stepX,
      y: pad + effectiveHeight - ((v - min) / range) * effectiveHeight,
    }));

    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

    let area = '';
    if (showArea) {
      area =
        line +
        ` L${(width - pad).toFixed(1)},${(height - pad).toFixed(1)} L${pad.toFixed(1)},${(height - pad).toFixed(1)} Z`;
    }

    const di = dotIndex !== undefined ? dotIndex : data.length - 1;
    return { line, area, dotX: coords[di]?.x ?? width - pad, dotY: coords[di]?.y ?? pad };
  }, [data, width, height, showArea, dotIndex]);

  if (!data.length) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      {fillColor && points.area && (
        <path d={points.area} fill={fillColor} opacity={0.15} />
      )}
      <path
        d={points.line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDot && (
        <>
          <circle cx={points.dotX} cy={points.dotY} r={2.5} fill={color} />
          <circle cx={points.dotX} cy={points.dotY} r={5} fill={color} opacity={0.2} />
        </>
      )}
    </svg>
  );
};

export default SparklineChart;
