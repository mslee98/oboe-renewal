import React, { useState, useEffect, useRef } from 'react';
import { ArchisketchProvider, useArchisketch } from '../context/ArchisketchContext';
import { ToolProvider } from '../context/ToolContext';
import { useSidebar } from '../context/SidebarContext';
import { SceneProvider } from '../context/SceneContext';
import EditorSidebar from '../layouts/EditorSidebar';
import Interior3D from '../components/Interior/Interior3D';

const Interior3DWithEditor = () => {
  const [isEditorSidebarOpen, setIsEditorSidebarOpen] = useState(true);
  const { isExpanded, isHovered, isMobileOpen } = useSidebar?.() || {};
  const containerRef = useRef(null);

  const handleToggleEditorSidebar = () => setIsEditorSidebarOpen((v) => !v);

  return (
    <SceneProvider>
      <ArchisketchProvider>
        <ToolProvider>
          <HydrateFromLocalStorage />
          <div
            ref={containerRef}
            className="w-full h-[calc(100vh-64px)] flex bg-white dark:bg-gray-900"
            style={{ position: 'relative' }}
          >
            <div className="flex-1 relative">
              <button
                onClick={handleToggleEditorSidebar}
                className="absolute top-4 right-4 z-10 p-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-lg transition-colors border border-gray-200 dark:border-gray-700"
                aria-label="Toggle Editor Sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* 기존 Interior3D (자체 Canvas 보유) */}
              <Interior3D />
            </div>

            {/* 기존 EditorSidebar (기능 유지) */}
            <div
              className={`h-full overflow-hidden transition-all duration-300 ease-in-out ${
                isEditorSidebarOpen ? 'w-80' : 'w-0'
              }`}
            >
              <div
                className={`w-80 h-full transition-transform duration-300 ease-in-out ${
                  isEditorSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
              >
                <EditorSidebar />
              </div>
            </div>
          </div>
        </ToolProvider>
      </ArchisketchProvider>
    </SceneProvider>
  );
};

export default Interior3DWithEditor;

// 로컬 스토리지 스냅샷을 컨텍스트로 로드
const HydrateFromLocalStorage = () => {
  const { loadSnapshot } = useArchisketch();
  useEffect(() => {
    try {
      const raw = localStorage.getItem('floorplanSnapshot');
      if (!raw) return;
      const snap = JSON.parse(raw);
      if (snap) loadSnapshot(snap);
    } catch (e) {
      console.warn('Failed to hydrate floorplan snapshot:', e);
    }
  }, [loadSnapshot]);
  return null;
};


