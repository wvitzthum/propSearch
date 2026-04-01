import React, { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  address?: string;
  className?: string;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, address, className = '' }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  const viewportRef = useRef<HTMLDivElement>(null);

  const currentImage = images[activeIndex];

  const handlePrev = useCallback(() => {
    setActiveIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [images.length]);

  const handleNext = useCallback(() => {
    setActiveIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [images.length]);

  const handleThumbnailClick = useCallback((index: number) => {
    setActiveIndex(index);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setImgError(false);
    setImgLoading(true);
  }, []);

  const handleZoomIn = useCallback(() => setZoom(prev => Math.min(prev + 0.5, 4)), []);
  const handleZoomOut = useCallback(() => setZoom(prev => Math.max(prev - 0.5, 1)), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.3 : 0.3;
    setZoom(prev => Math.min(Math.max(prev + delta, 1), 4));
    if (zoom <= 1) setPosition({ x: 0, y: 0 });
  }, [zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [zoom, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !viewportRef.current) return;

    const maxPan = 100 * (zoom - 1);
    let newX = e.clientX - dragStart.x;
    let newY = e.clientY - dragStart.y;

    newX = Math.max(-maxPan, Math.min(maxPan, newX));
    newY = Math.max(-maxPan, Math.min(maxPan, newY));

    setPosition({ x: newX, y: newY });
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'Escape') setIsLightboxOpen(false);
  }, [handlePrev, handleNext]);

  const openLightbox = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setIsLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
  }, []);

  // Reset state when image changes
  React.useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setImgError(false);
    setImgLoading(true);
  }, [currentImage]);

  if (!images || images.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-linear-card border border-linear-border rounded-xl ${className}`}>
        <div className="flex flex-col items-center gap-2 opacity-20">
          <X size={24} className="text-linear-accent" />
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-center px-4">
            No Images Available
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`relative group ${className}`} onKeyDown={handleKeyDown} tabIndex={0}>
        {/* Main Image Viewport */}
        <div
          ref={viewportRef}
          className="relative h-full w-full bg-linear-card overflow-hidden rounded-xl"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Loading State */}
          {imgLoading && (
            <div className="absolute inset-0 bg-linear-card animate-pulse flex items-center justify-center z-10">
              <div className="h-8 w-8 rounded-full border-2 border-linear-accent/20 border-t-linear-accent animate-spin" />
            </div>
          )}

          {/* Image */}
          {imgError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-linear-card">
              <div className="flex flex-col items-center gap-2 opacity-20">
                <X size={32} className="text-linear-accent" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                  Image Unavailable
                </span>
              </div>
            </div>
          ) : (
            <img
              src={currentImage}
              alt={`${address || 'Property'} - Image ${activeIndex + 1}`}
              className={`h-full w-full object-cover transition-all duration-300 ${isDragging ? 'cursor-grabbing' : zoom > 1 ? 'cursor-grab' : ''}`}
              style={{
                transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                opacity: imgLoading ? 0 : 1
              }}
              onLoad={() => setImgLoading(false)}
              onError={() => { setImgError(true); setImgLoading(false); }}
              draggable={false}
            />
          )}

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-white/80 hover:text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 z-20"
                title="Previous image"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-white/80 hover:text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 z-20"
                title="Next image"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          {/* Controls Overlay */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
            <div className="flex bg-black/60 backdrop-blur-xl border border-white/10 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                className={`p-1.5 rounded-md transition-all ${zoom <= 1 ? 'text-white/30 cursor-not-allowed' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <div className="w-px h-4 bg-white/10 mx-0.5 self-center" />
              <span className="px-1.5 text-[10px] font-mono font-bold text-white self-center">
                {Math.round(zoom * 100)}%
              </span>
              <div className="w-px h-4 bg-white/10 mx-0.5 self-center" />
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                className={`p-1.5 rounded-md transition-all ${zoom >= 4 ? 'text-white/30 cursor-not-allowed' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
            </div>

            <button
              onClick={openLightbox}
              className="p-1.5 bg-black/60 backdrop-blur-xl border border-white/10 text-white/60 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
              title="Fullscreen"
            >
              <Maximize2 size={14} />
            </button>
          </div>

          {/* Image Counter */}
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-mono font-bold text-white border border-white/10 z-20">
            {activeIndex + 1} / {images.length}
          </div>
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 flex gap-1.5 z-20">
            {images.slice(0, 5).map((url, i) => (
              <button
                key={i}
                onClick={() => handleThumbnailClick(i)}
                className={`h-10 w-10 rounded border overflow-hidden transition-all ${
                  i === activeIndex
                    ? 'border-linear-accent ring-2 ring-linear-accent/50 shadow-lg shadow-linear-accent/20'
                    : 'border-white/20 opacity-70 hover:opacity-100 hover:border-white/40'
                }`}
              >
                <img
                  src={url}
                  alt={`Thumbnail ${i + 1}`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </button>
            ))}
            {images.length > 5 && (
              <div className="h-10 px-2 rounded border border-white/20 bg-black/60 backdrop-blur-md flex items-center justify-center text-[10px] font-bold text-white">
                +{images.length - 5}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white bg-white/10 rounded-full transition-all z-30"
          >
            <X size={24} />
          </button>

          {/* Navigation */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-30"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-30"
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}

          {/* Lightbox Image */}
          <div
            className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              src={currentImage}
              alt={`${address || 'Property'} - Image ${activeIndex + 1}`}
              className={`max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl ${isDragging ? 'cursor-grabbing' : zoom > 1 ? 'cursor-grab' : 'cursor-zoom-in'}`}
              style={{
                transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`
              }}
              onClick={() => zoom < 4 && setZoom(prev => Math.min(prev + 0.5, 4))}
              draggable={false}
            />
          </div>

          {/* Lightbox Controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-lg p-2 z-30">
            <button
              onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
              disabled={zoom <= 1}
              className={`p-2 rounded-md transition-all ${zoom <= 1 ? 'text-white/30 cursor-not-allowed' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
            >
              <ZoomOut size={18} />
            </button>
            <span className="px-3 text-sm font-mono font-bold text-white min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
              disabled={zoom >= 4}
              className={`p-2 rounded-md transition-all ${zoom >= 4 ? 'text-white/30 cursor-not-allowed' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
            >
              <ZoomIn size={18} />
            </button>

            <div className="w-px h-6 bg-white/20 mx-1" />

            <div className="px-2 text-sm font-mono text-white/60">
              {activeIndex + 1} / {images.length}
            </div>
          </div>

          {/* Thumbnails Strip */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-lg p-2 max-w-[90vw] overflow-x-auto z-30">
            {images.map((url, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); handleThumbnailClick(i); }}
                className={`h-12 w-12 flex-shrink-0 rounded border overflow-hidden transition-all ${
                  i === activeIndex
                    ? 'border-linear-accent ring-2 ring-linear-accent/50'
                    : 'border-white/20 opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={url}
                  alt={`Thumbnail ${i + 1}`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default ImageCarousel;
