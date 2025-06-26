import { Canvas } from "@react-three/fiber";
import React, { useState, useEffect, useRef } from "react";
import { useSidebar } from "../context/SidebarContext";
import { Grid, OrbitControls } from "@react-three/drei";

const Oboe = () => {
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
            className="overflow-hidden" 
            style={{ 
                height: canvasHeight,
                width: canvasWidth,
                position: 'relative'
            }}
        >
            <Canvas camera={{ position: [2, 5, 3] }}>
                <color attach="background" args={["#0a0a0f"]} />

                <Grid
                    position={[0, 0, 0]}
                    args={[100, 100]}
                    sectionColorA={[0, 0.8, 1]}
                    sectionColorB={[0, 0.4, 0.8]}
                    sectionSize={1}
                    fadeStrength={1.5}
                    infiniteGrid={true}
                    cellColor={[0, 0.2, 0.4]}
                    cellSize={1}
                    cellThickness={0.5}
                    cellOffset={[0, 0]}
                />

                <mesh>
                    <boxGeometry />
                    <meshBasicMaterial color="#00aaff" />
                </mesh>

                <OrbitControls />
            </Canvas>
        </div>
    )
}

export default Oboe;