// FE-204: Migrated to @visx — replaces hand-rolled SVG path math
import React, { useMemo } from 'react';
import { scaleLinear } from '@visx/scale';
import { LinePath, AreaClosed } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';

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
  const chart = useMemo(() => {
    // QA-185: Guard against NaN values in data
    const validData = data.filter(d => typeof d === 'number' && isFinite(d));
    if (validData.length < 2) return null;
    const pad = 2;
    const innerWidth = width - pad * 2;
    const innerHeight = height - pad * 2;

    const xScale = scaleLinear({
      domain: [0, validData.length - 1],
      range: [pad, width - pad],
    });
    const yScale = scaleLinear({
      domain: [Math.min(...validData), Math.max(...validData)],
      range: [height - pad, pad],
    });

    const di = dotIndex !== undefined ? dotIndex : validData.length - 1;
    const dotX = xScale(di);
    const dotY = yScale(validData[di] ?? 0);

    return { xScale, yScale, dotX, dotY, innerWidth, innerHeight, validData };
  }, [data, width, height, dotIndex]);

  if (data.length < 2) return null;

  // QA-185: Use validData for SVG rendering to prevent NaN in path coordinates
  const renderData = chart?.validData ?? data.filter((d: number) => isFinite(d));

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      {fillColor && showArea && chart && (
        <AreaClosed
          data={renderData}
          x={(_, i) => chart.xScale(i)}
          y={d => chart.yScale(d)}
          yScale={chart.yScale}
          curve={curveMonotoneX}
          fill={fillColor}
          opacity={0.15}
        />
      )}
      <LinePath
        data={renderData}
        x={(_, i) => chart!.xScale(i)}
        y={d => chart!.yScale(d)}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        curve={curveMonotoneX}
      />
      {showDot && chart && (
        <>
          <circle cx={chart.dotX} cy={chart.dotY} r={2.5} fill={color} />
          <circle cx={chart.dotX} cy={chart.dotY} r={5} fill={color} opacity={0.2} />
        </>
      )}
    </svg>
  );
};

export default SparklineChart;
