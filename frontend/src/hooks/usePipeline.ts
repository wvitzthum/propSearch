import { useState, useEffect, useCallback } from 'react';

export type PropertyStatus = 'discovered' | 'shortlisted' | 'vetted' | 'archived';

export interface PipelineState {
  [propertyId: string]: PropertyStatus;
}

export const usePipeline = () => {
  const [pipeline, setPipeline] = useState<PipelineState>(() => {
    const saved = localStorage.getItem('propsearch_pipeline');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('propsearch_pipeline', JSON.stringify(pipeline));
  }, [pipeline]);

  const setStatus = useCallback((id: string, status: PropertyStatus) => {
    setPipeline(prev => ({ ...prev, [id]: status }));
  }, []);

  const getStatus = useCallback((id: string): PropertyStatus => {
    return pipeline[id] || 'discovered';
  }, [pipeline]);

  return { pipeline, setStatus, getStatus };
};
