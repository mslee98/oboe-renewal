import { Canvas } from "@react-three/fiber";
import React, { useState, useEffect, useRef } from "react";
import { useSidebar } from "../../context/SidebarContext";
import { Grid, OrbitControls, useGLTF, Outlines, Html } from "@react-three/drei";
import * as THREE from "three";
import CxArenaView from "../../components/CxArena/CxArenaView";



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
            className="overflow-hidden" 
            style={{ 
                height: canvasHeight,
                width: canvasWidth,
                position: 'relative'
            }}
        >
            <Canvas camera={{ position: [2, 5, 3] }}>
                <color attach="background" args={["#1a1a2e"]} />

                {/* 환경 조명 강화 */}
                <ambientLight intensity={0.8} />
                
                {/* 메인 방향성 조명 */}
                <directionalLight 
                    position={[5, 5, 5]} 
                    intensity={1.5}
                    castShadow
                    shadow-mapSize-width={2048}
                    shadow-mapSize-height={2048}
                />
                
                {/* 보조 조명들 */}
                <directionalLight 
                    position={[-5, 3, -5]} 
                    intensity={0.8}
                    color="#ffffff"
                />
                
                <pointLight 
                    position={[0, 10, 0]} 
                    intensity={1}
                    color="#ffffff"
                    distance={20}
                />
                
                {/* 전면 조명 */}
                <directionalLight 
                    position={[0, 0, 5]} 
                    intensity={0.6}
                    color="#ffffff"
                />

                <CxArenaView />

                {/* 메인 그리드 - 황금빛 사이버펑크 */}
                <Grid
                    position={[0, 0, 0]}
                    args={[100, 100]}
                    sectionColorA={[1, 0.8, 0]}      // 골드
                    sectionColorB={[1, 0.4, 0]}     // 오렌지
                    sectionSize={2}
                    fadeStrength={2.5}
                    infiniteGrid={true}
                    cellColor={[0.3, 0.2, 0.1]}     // 어두운 브라운
                    cellSize={0.5}
                    cellThickness={0.3}
                    cellOffset={[0, 0]}
                />

                {/* 보조 그리드 - 네온 퍼플 */}
                <Grid
                    position={[0, 0.01, 0]}
                    args={[50, 50]}
                    sectionColorA={[0.8, 0, 1]}     // 네온 퍼플
                    sectionColorB={[0.4, 0, 0.8]}   // 다크 퍼플
                    sectionSize={5}
                    fadeStrength={1.8}
                    infiniteGrid={true}
                    cellColor={[0.2, 0.1, 0.3]}     // 어두운 퍼플
                    cellSize={2}
                    cellThickness={0.2}
                    cellOffset={[0.5, 0.5]}
                />

                {/* 배경 그리드 - 네온 블루 */}
                <Grid
                    position={[0, -0.01, 0]}
                    args={[200, 200]}
                    sectionColorA={[0, 0.8, 1]}     // 네온 블루
                    sectionColorB={[0, 0.4, 0.8]}   // 다크 블루
                    sectionSize={10}
                    fadeStrength={3}
                    infiniteGrid={true}
                    cellColor={[0.1, 0.2, 0.3]}     // 어두운 블루
                    cellSize={5}
                    cellThickness={0.1}
                    cellOffset={[0, 0]}
                />

                <OrbitControls />
            </Canvas>
        </div>
    )
}

const CxArenaView2 = () => {

    const { nodes,scene } = useGLTF('/models/IDC_CXARENA_V0.40.glb');
    console.log(scene)
    console.log(nodes)

    const [hovered, setHovered] = useState(false);
  
    const renderMeshes = (object, isRoot = false) => {
        if (!object) return null;
      
        const children = object.children?.map(child => renderMeshes(child, false));
      
        if (object.isMesh) {
          return (
            <mesh
              key={object.uuid}
              geometry={object.geometry}
              material={object.material}
              position={object.position}
              rotation={object.rotation}
              scale={object.scale}
              onPointerOver={e => {
                e.stopPropagation();
                setHovered(object.uuid);
              }}
              onPointerOut={e => {
                e.stopPropagation();
                setHovered(null);
              }}
            >
              {/* 오직 isRoot일 때만 아웃라인 */}
              {isRoot && hovered === object.uuid && (
                <Outlines angle={10} thickness={5} color="#ffffff" />
              )}
              {children}
            </mesh>
          );
        } else if (object.children?.length) {

          if(object.isGroup) return;

          return (
            <group
              key={object.uuid}
              position={object.position}
              rotation={object.rotation}
              scale={object.scale}
            >
              {children}
            </group>
          );
        }
      
        return null;
      };
      
      return (
        <group position={[0, 0.02, 0]}>
          {renderMeshes(nodes.SerRackA_001, true)}
          {renderMeshes(nodes.SerRackA_002, true)}
          {renderMeshes(nodes.SerRackA_003, true)}
          {renderMeshes(nodes.SerRackA_004, true)}
          {renderMeshes(nodes.SerRackA_005, true)}
          {renderMeshes(nodes.SerRackA_006, true)}
          {renderMeshes(nodes.SerRackA_007, true)}
        </group>
      );
  };

export default CxArena;