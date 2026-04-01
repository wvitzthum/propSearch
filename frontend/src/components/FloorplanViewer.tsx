import React, { useState, useRef, useCallback } from 'react';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Layers, Download } from 'lucide-react';

interface FloorplanViewerProps {
  url: string;
  address?: string;
}

const FloorplanViewer: React.FC<FloorplanViewerProps> = ({ url, address }) => {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 8));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 0.5));

  const handleReset = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 8));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return; // Only drag when zoomed in
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [zoom, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !viewportRef.current || !imgRef.current) return;

    const container = viewportRef.current;
    const img = imgRef.current;
    const containerRect = container.getBoundingClientRect();

    // Calculate scaled image dimensions
    const scaledWidth = img.naturalWidth * zoom;
    const scaledHeight = img.naturalHeight * zoom;

    // Calculate max pan boundaries
    const maxPanX = Math.max(0, (scaledWidth - containerRect.width) / 2);
    const maxPanY = Math.max(0, (scaledHeight - containerRect.height) / 2);

    // Calculate new position with bounds
    let newX = e.clientX - dragStart.x;
    let newY = e.clientY - dragStart.y;

    // Constrain to bounds
    newX = Math.max(-maxPanX, Math.min(maxPanX, newX));
    newY = Math.max(-maxPanY, Math.min(maxPanY, newY));

    setPosition({ x: newX, y: newY });
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleImageLoad = useCallback(() => {
    // Image loaded, can be used for future size calculations
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className={`relative bg-linear-bg border border-linear-border rounded-2xl flex flex-col group ${isFullscreen ? 'fixed inset-0 z-[100] h-screen w-screen rounded-none' : 'h-full w-full shadow-2xl overflow-hidden'}`}
    >
      {/* Header / Controls Overlay */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-lg flex items-center gap-2">
            <Layers size={14} className="text-linear-accent" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Spatial Analysis</span>
          </div>
          {address && (
            <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md border border-white/5 rounded-lg">
              <span className="text-[9px] font-bold text-linear-text-muted uppercase tracking-tighter truncate max-w-[200px] block">
                {address}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-black/60 backdrop-blur-xl border border-white/10 rounded-lg p-1">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-linear-text-muted hover:text-white hover:bg-white/5 rounded-md transition-all"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <div className="w-px h-4 bg-white/10 mx-1 self-center" />
            <span className="px-2 text-[10px] font-mono font-bold text-white self-center">
              {Math.round(zoom * 100)}%
            </span>
            <div className="w-px h-4 bg-white/10 mx-1 self-center" />
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-linear-text-muted hover:text-white hover:bg-white/5 rounded-md transition-all"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          <button
            onClick={handleReset}
            className="p-2 bg-black/60 backdrop-blur-xl border border-white/10 text-linear-text-muted hover:text-white rounded-lg transition-all"
            title="Reset View"
          >
            <RotateCcw size={14} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 bg-black/60 backdrop-blur-xl border border-white/10 text-linear-text-muted hover:text-white rounded-lg transition-all"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <a
            href={url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-linear-accent text-white rounded-lg shadow-lg shadow-linear-accent/20 transition-all hover:brightness-110"
            title="Download Blueprint"
          >
            <Download size={14} />
          </a>
        </div>
      </div>

      {/* Main Viewport - NO overflow hidden, allows pan beyond bounds */}
      <div
        ref={viewportRef}
        className={`flex-grow relative flex items-center justify-center cursor-grab ${isDragging ? 'cursor-grabbing' : 'cursor-move'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="relative"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
          }}
        >
          <img
            ref={imgRef}
            src={url}
            alt="Property Floorplan"
            draggable={false}
            className="max-w-none max-h-none shadow-2xl shadow-black/40"
            onLoad={handleImageLoad}
            style={{
              maxHeight: isFullscreen ? '85vh' : '400px',
              width: 'auto'
            }}
          />
        </div>

        {/* Dynamic Watermark */}
        <div className="absolute bottom-6 left-6 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-linear-accent rounded flex items-center justify-center text-[6px] font-black italic">IS</div>
            <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">propSearch institutional</span>
          </div>
        </div>

        {/* Pan hint overlay when zoomed in */}
        {zoom > 1 && (
          <div className="absolute bottom-6 right-6 opacity-60 group-hover:opacity-0 transition-opacity pointer-events-none">
            <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[8px] font-bold text-white uppercase">
              Drag to pan
            </div>
          </div>
        )}
      </div>

      {/* Zoom / Pan Help (Small Bottom Banner) */}
      <div className="h-8 bg-black/40 backdrop-blur-md border-t border-white/5 flex items-center justify-between px-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-4 text-[8px] font-bold text-linear-text-muted uppercase tracking-widest">
          <span className="flex items-center gap-1"><span className="text-white">SCROLL</span> TO ZOOM</span>
          {zoom > 1 && <span className="flex items-center gap-1"><span className="text-white">DRAG</span> TO PAN</span>}
        </div>
        <div className="text-[8px] font-mono text-linear-accent/60 uppercase">
          Precision Spatial Data • {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};

export default FloorplanViewer;
