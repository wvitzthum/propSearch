import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface PropertyImageProps {
  src: string;
  alt: string;
  className?: string;
}

const PropertyImage: React.FC<PropertyImageProps> = ({ src, alt, className = '' }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error || !src) {
    return (
      <div className={`flex flex-col items-center justify-center bg-linear-card border border-linear-border rounded-lg ${className}`}>
        <div className="flex flex-col items-center gap-2 opacity-20">
          <ImageOff size={24} className="text-linear-accent" />
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-center px-4">
            Asset Visual Unavailable
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-linear-bg ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-linear-card animate-pulse flex items-center justify-center">
          <div className="h-4 w-4 rounded-full border-2 border-linear-accent/20 border-t-linear-accent animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`h-full w-full object-cover transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
      />
    </div>
  );
};

export default PropertyImage;
