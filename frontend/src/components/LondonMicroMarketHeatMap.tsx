// FE-121: Geographic heatmap for London postcodes — visualises Micro-Market Velocity spatially
// Replaces the need for a static SVG bubble map with an interactive Leaflet layer
import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { useMacroData } from '../hooks/useMacroData';
import { extractValue } from '../types/macro';
import 'leaflet/dist/leaflet.css';

// Approximate centroids for each area (lat, lng) — keyed by short area name
const AREA_COORDS: Record<string, [number, number]> = {
  'Belsize Park':    [51.5500, -0.1650],
  'Islington':       [51.5470, -0.1030],
  'West Hampstead':  [51.5470, -0.2010],
  'Bayswater':      [51.5120, -0.1880],
  'Chelsea':         [51.4900, -0.1680],
  'Pimlico':         [51.4893, -0.1400],
  'Bermondsey':      [51.5016, -0.0711],
};

const heatColor = (heat: number): string => {
  if (heat >= 8) return '#22c55e'; // green — hot
  if (heat >= 5) return '#f59e0b'; // amber — neutral
  return '#ef4444';               // red — cold
};

const heatColorWithOpacity = (heat: number): string => {
  if (heat >= 8) return 'rgba(34,197,94,0.35)';
  if (heat >= 5) return 'rgba(245,158,11,0.35)';
  return 'rgba(239,68,68,0.35)';
};

const heatBorderColor = (heat: number): string => {
  if (heat >= 8) return '#22c55e';
  if (heat >= 5) return '#f59e0b';
  return '#ef4444';
};

const LondonMicroMarketHeatMap: React.FC = () => {
  const { data } = useMacroData();

  const areas = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const heatData: any[] = data?.area_trends || data?.area_heat_index || [];
    const globalBenchmark = data?.london_benchmark ?? 1.2;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return heatData.map((a: any) => {
      const rawHeat = a.heat_index?.value ?? a.heat_index ?? a.score ?? 5;
      const heat = extractValue(rawHeat) ?? 5;
      const growth = extractValue(a.annual_growth?.value ?? a.annual_growth) ?? 0;
      const forecast = extractValue(a.hpi_forecast_12m ?? a.hpi_forecast_12m?.value);
      const areaBenchmark = extractValue(a.london_benchmark ?? a.london_benchmark?.value) ?? globalBenchmark;
      const delta = forecast != null ? forecast - areaBenchmark : growth - areaBenchmark;

      // Resolve area name for coordinate lookup
      const areaName = a.area || 'Unknown';
      const shortName = areaName.split(' (')[0].trim();
      const coords: [number, number] = AREA_COORDS[shortName] ?? AREA_COORDS[areaName] ?? [51.5074, -0.1278];

      return {
        name: areaName,
        shortName,
        heat,
        growth,
        forecast,
        delta,
        londonBenchmark: areaBenchmark,
        coords,
        currentPrice: a.current_price_gbp ?? null,
        cumulativeGrowth: a.cumulative_growth_pct ?? null,
      };
    })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => b.heat - a.heat);
  }, [data]);

  if (!data || areas.length === 0) {
    return (
      <div className="bg-linear-card border border-linear-border rounded-xl p-8 flex flex-col items-center justify-center text-center">
        <div className="h-3 w-3 rounded-full bg-linear-text-muted/30 mb-3 animate-pulse" />
        <div className="text-[10px] font-black text-linear-text-muted uppercase tracking-widest">
          No Area Data Available
        </div>
        <div className="text-[9px] text-linear-text-muted/50 mt-1">
          Area micro-market data not yet populated
        </div>
      </div>
    );
  }

  const londonCenter: [number, number] = [51.510, -0.155];

  return (
    <div className="bg-linear-card border border-linear-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-linear-border bg-linear-card/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-retro-green animate-pulse" />
          <h3 className="text-[10px] font-black text-white uppercase tracking-widest">
            London Micro-Market Heat Map
          </h3>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 text-[8px] font-bold">
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-linear-text-muted">Hot 8+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="text-linear-text-muted">Neutral 5–7.9</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            <span className="text-linear-text-muted">Cool &lt;5</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="relative" style={{ height: 320 }}>
        <MapContainer
          center={londonCenter}
          zoom={12}
          scrollWheelZoom={false}
          dragging={true}
          zoomControl={true}
          style={{ height: '100%', width: '100%', background: '#0a0e17' }}
          attributionControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {areas.map((area: any) => {
            const color = heatColor(area.heat);
            const fillColor = heatColorWithOpacity(area.heat);
            const borderColor = heatBorderColor(area.heat);
            // Radius scales with heat index (bigger = hotter)
            const radius = 300 + area.heat * 80;

            return (
              <CircleMarker
                key={area.name}
                center={area.coords}
                radius={radius / 10}
                pathOptions={{
                  color: borderColor,
                  fillColor: fillColor,
                  fillOpacity: 0.45,
                  weight: 1.5,
                  opacity: 0.9,
                }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -8]}
                  className="area-heat-tooltip"
                  opacity={0.95}
                >
                  <div className="text-[10px] font-black text-white">{area.shortName}</div>
                  <div className="text-[9px]" style={{ color }}>Heat {area.heat.toFixed(1)}</div>
                </Tooltip>

                <Popup className="area-heat-popup" maxWidth={200}>
                  <div className="bg-black/90 text-white rounded-lg px-3 py-2 min-w-[160px]">
                    <div className="text-[11px] font-black mb-2 leading-tight">{area.name.split(' (')[0]}</div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
                      <div className="text-gray-400">Heat Index</div>
                      <div className="font-black text-right" style={{ color }}>{area.heat.toFixed(1)}</div>

                      <div className="text-gray-400">YoY Growth</div>
                      <div className={`font-black text-right ${area.growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {area.growth >= 0 ? '+' : ''}{area.growth.toFixed(1)}%
                      </div>

                      <div className="text-gray-400">+12M Fcast</div>
                      <div className={`font-black text-right ${(area.forecast ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {area.forecast != null ? `${area.forecast >= 0 ? '+' : ''}${area.forecast.toFixed(1)}%` : '—'}
                      </div>

                      <div className="text-gray-400">vs Benchmark</div>
                      <div className={`font-black text-right ${area.delta > 0 ? 'text-emerald-400' : area.delta < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                        {area.delta > 0 ? '+' : ''}{area.delta.toFixed(1)}pp
                      </div>

                      {area.currentPrice && (
                        <>
                          <div className="text-gray-400">Current £/sqft</div>
                          <div className="font-black text-right">£{(area.currentPrice / 800).toFixed(0)}</div>
                        </>
                      )}

                      {area.cumulativeGrowth != null && (
                        <>
                          <div className="text-gray-400">Cum. 10yr</div>
                          <div className={`font-black text-right ${area.cumulativeGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {area.cumulativeGrowth >= 0 ? '+' : ''}{area.cumulativeGrowth.toFixed(1)}%
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Dark vignette overlay for aesthetics */}
        <div className="absolute inset-0 pointer-events-none z-[400]" style={{
          background: 'radial-gradient(ellipse at center, transparent 55%, rgba(10,14,23,0.7) 100%)',
        }} />

        {/* Area label overlay — top-right rank strip */}
        <div className="absolute top-2 right-2 z-[500] flex flex-col gap-1 pointer-events-none">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {areas.map((area: any, i: number) => {
            const color = heatColor(area.heat);
            return (
              <div
                key={area.name}
                className="flex items-center gap-1.5 px-2 py-1 rounded border text-[8px] font-bold"
                style={{
                  backgroundColor: `${color}18`,
                  borderColor: `${color}40`,
                  color,
                  minWidth: 80,
                }}
              >
                <span className="font-black text-[7px] opacity-60">#{i + 1}</span>
                <span className="text-white font-semibold">{area.shortName}</span>
                <span className="ml-auto font-black">{area.heat.toFixed(1)}</span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="absolute bottom-2 left-3 z-[500] pointer-events-none">
          <div className="text-[7px] text-gray-500 font-mono">
            {areas.length} Markets · Click marker for details
          </div>
        </div>
      </div>
    </div>
  );
};

export default LondonMicroMarketHeatMap;
