import { Canvas } from "@react-three/fiber";
import React, { useState, useEffect, useRef } from "react";
import { useSidebar } from "../../context/SidebarContext";
import { Grid, OrbitControls, useGLTF, Outlines, Html } from "@react-three/drei";
import * as THREE from "three";
import CxArenaView from "../../components/CxArena/CxArenaView";
import RealTimeCharts from "../../components/CxArena/RealTimeCharts";
import NotificationList from "../../components/common/NotificationList";
import ServerMonitoringDashboard from "../../components/CxArena/ServerMonitoringDashboard";

const CxArena = () => {
  const [canvasHeight, setCanvasHeight] = useState("100vh");
  const [canvasWidth, setCanvasWidth] = useState("100%");
  const containerRef = useRef(null);
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  useEffect(() => {
    const updateDimensions = () => {
      const header = document.querySelector('header');
      const sidebar = document.querySelector('aside'); // 사이드바 요소
      
      if (header && containerRef.current) {
        const headerHeight = header.offsetHeight;
        const headerBorder = parseInt(getComputedStyle(header).borderBottomWidth) || 0;
        const totalHeaderHeight = headerHeight + headerBorder;
        
        // 약간의 여유 공간을 두어 스크롤 방지
        const newHeight = `calc(100vh - ${totalHeaderHeight}px)`;
        setCanvasHeight(newHeight);
      }

      // 사이드바 너비 계산
      if (sidebar) {
        const sidebarWidth = sidebar.offsetWidth;
        const sidebarBorder = parseInt(getComputedStyle(sidebar).borderRightWidth) || 0;
        const totalSidebarWidth = sidebarWidth + sidebarBorder;
        
        // lg 브레이크포인트 이상에서만 사이드바 너비 적용
        const isLargeScreen = window.innerWidth >= 1024;
        if (isLargeScreen && !isMobileOpen) {
          setCanvasWidth(`calc(100vw - ${totalSidebarWidth}px)`);
        } else {
          setCanvasWidth("100vw");
        }
      }
    };

    // 초기 실행
    updateDimensions();
    
    // 리사이즈 이벤트 리스너
    window.addEventListener('resize', updateDimensions);
    
    // 사이드바 상태 변경 시에도 업데이트
    const resizeObserver = new ResizeObserver(updateDimensions);
    const header = document.querySelector('header');
    const sidebar = document.querySelector('aside');
    
    if (header) resizeObserver.observe(header);
    if (sidebar) resizeObserver.observe(sidebar);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      resizeObserver.disconnect();
    };
  }, [isExpanded, isHovered, isMobileOpen]);
  
  return (
    <div 
      ref={containerRef} 
      className="flex h-full overflow-hidden dark:bg-gray-900" 
      style={{ 
        height: canvasHeight,
        position: 'relative'
      }}
    >
      {/* 3D Canvas 영역 */}
      <div 
        className="flex-1 relative"
        style={{ 
          width: canvasWidth,
        }}
      >
        <Canvas
          camera={{ position: [10, 10, 10], fov: 50 }}
          gl={{ 
            preserveDrawingBuffer: false, // 성능 개선
            antialias: true 
          }}
        >
          <CxArenaView />
        </Canvas>

        {/* === 2D 차트 오버레이 === */}
        <div className="absolute top-4 right-4 z-10">
          <RealTimeCharts />
        </div>

        {/* === 실시간 알림 리스트 오버레이 === */}
        <div className="absolute top-4 left-4 z-10">
          <NotificationList />
        </div>

        {/* === 서버 모니터링 대시보드 (왼쪽 아래) === */}
        <div className="absolute bottom-4 left-4 z-10">
          <ServerMonitoringDashboard />
        </div>
      </div>
    </div>
  );
};

export default CxArena;