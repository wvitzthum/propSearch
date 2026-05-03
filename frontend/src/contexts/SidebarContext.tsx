import React, { createContext, useContext, useState, useCallback } from 'react';

interface SidebarContextValue {
  sidebarVisible: boolean;
  hideSidebar: () => void;
  showSidebar: () => void;
  toggleSidebar: () => void;
  pipelineBarVisible: boolean;
  hidePipelineBar: () => void;
  showPipelineBar: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  sidebarVisible: true,
  hideSidebar: () => {},
  showSidebar: () => {},
  toggleSidebar: () => {},
  pipelineBarVisible: true,
  hidePipelineBar: () => {},
  showPipelineBar: () => {},
});

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [pipelineBarVisible, setPipelineBarVisible] = useState(true);

  const hideSidebar = useCallback(() => setSidebarVisible(false), []);
  const showSidebar = useCallback(() => setSidebarVisible(true), []);
  const toggleSidebar = useCallback(() => setSidebarVisible(v => !v), []);
  const hidePipelineBar = useCallback(() => setPipelineBarVisible(false), []);
  const showPipelineBar = useCallback(() => setPipelineBarVisible(true), []);

  return (
    <SidebarContext.Provider value={{ sidebarVisible, hideSidebar, showSidebar, toggleSidebar, pipelineBarVisible, hidePipelineBar, showPipelineBar }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => useContext(SidebarContext);
