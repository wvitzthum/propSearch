import React, { useState, useRef } from 'react';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Layers, Download } from 'lucide-react';
import PropertyImage from './PropertyImage';

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

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

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
      className={`relative bg-linear-bg border border-linear-border rounded-2xl overflow-hidden flex flex-col group ${isFullscreen ? 'h-screen w-screen' : 'h-full w-full shadow-2xl'}`}
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

      {/* Main Viewport */}
      <div 
        className={`flex-grow relative flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing ${isDragging ? 'cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="transition-transform duration-200 ease-out"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            pointerEvents: zoom > 1 ? 'none' : 'auto'
          }}
        >
          <PropertyImage 
            src={url} 
            alt="Property Floorplan" 
            className="max-w-full max-h-[80vh] object-contain shadow-2xl shadow-black/40"
          />
        </div>

        {/* Dynamic Watermark */}
        <div className="absolute bottom-6 left-6 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-linear-accent rounded flex items-center justify-center text-[6px] font-black italic">IS</div>
            <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">propSearch institutional</span>
          </div>
        </div>
      </div>

      {/* Zoom / Pan Help (Small Bottom Banner) */}
      <div className="h-8 bg-black/40 backdrop-blur-md border-t border-white/5 flex items-center justify-between px-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-4 text-[8px] font-bold text-linear-text-muted uppercase tracking-widest">
          <span className="flex items-center gap-1"><span className="text-white">DRAG</span> TO PAN</span>
          <span className="flex items-center gap-1"><span className="text-white">SCROLL</span> TO ZOOM</span>
        </div>
        <div className="text-[8px] font-mono text-linear-accent/60 uppercase">
          Precision Spatial Data • {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};

export default FloorplanViewer;
