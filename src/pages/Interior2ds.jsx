import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { useSidebar } from "../context/SidebarContext";
import ToolbarMenu from "../components/common/ToolbarMenu";
import { ArchisketchProvider, useArchisketch } from "../context/ArchisketchContext";
import { ToolProvider, useTool } from "../context/ToolContext";
import { Application, extend } from '@pixi/react';
import { Graphics, Container, Text } from 'pixi.js';
import defaultCursor from '../assets/default-cursor.svg';
import drawCursor from '../assets/draw-cursor.svg';
import CornerComponent from '../components/Interior/CornerComponent';
import VirtualCornerOverlay from '../components/Interior/VirtualCornerOverlay';
import Wall2DDragOverlay from '../components/Interior/Wall2DDragOverlay';
import ZoomController from '../components/Interior/ZoomController';


// PIXI 컴포넌트들을 React 컴포넌트로 등록
extend({ Graphics, Container, Text });

// 커스텀 커서 CSS 스타일 추가
const cursorStyles = `
  .cursor-default {
    cursor: url('${defaultCursor}') 4 4, auto;
  }
  .cursor-draw {
    cursor: url('${drawCursor}') 12 12, crosshair;
  }
`;

// Interior2ds 내부 컴포넌트
const Interior2dsContent = () => {
    const { selectedTool, selectedMode, handleToolSelect, handleModeSelect } = useTool();
    const [canvasHeight, setCanvasHeight] = useState("100vh");
    const [canvasWidth, setCanvasWidth] = useState("100%");
    const containerRef = useRef(null);
    const { isExpanded, isHovered, isMobileOpen } = useSidebar();

    // 커서 스타일을 DOM에 주입
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = cursorStyles;
        document.head.appendChild(style);
        
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    useEffect(() => {
        const updateDimensions = () => {
        const header = document.querySelector('header');
        const sidebar = document.querySelector('aside');
        
        if (header && containerRef.current) {
            const headerHeight = header.offsetHeight;
            const headerBorder = parseInt(getComputedStyle(header).borderBottomWidth) || 0;
            const totalHeaderHeight = headerHeight + headerBorder;
            
            const newHeight = `calc(100vh - ${totalHeaderHeight}px)`;
            setCanvasHeight(newHeight);
        }

        if (sidebar) {
            const sidebarWidth = sidebar.offsetWidth;
            const sidebarBorder = parseInt(getComputedStyle(sidebar).borderRightWidth) || 0;
            const totalSidebarWidth = sidebarWidth + sidebarBorder;
            
            const isLargeScreen = window.innerWidth >= 1024;
            if (isLargeScreen && !isMobileOpen) {
            setCanvasWidth(`calc(100vw - ${totalSidebarWidth}px)`);
            } else {
            setCanvasWidth("100vw");
            }
        }
        };

        updateDimensions();
        
        window.addEventListener('resize', updateDimensions);
        
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

    const isWallDrawingMode = () => {
        return selectedTool === "wall-drawing" && selectedMode === "draw";
    };

    useEffect(() => {
        console.log("Current tool:", selectedTool, "Current mode:", selectedMode);
        console.log("Is wall drawing mode:", isWallDrawingMode());
    }, [selectedTool, selectedMode]);

    // 모드별 커서 클래스 결정
    const getCursorClass = () => {
        if (selectedTool === "cursor") {
            return "cursor-default";
        } else if (selectedTool === "wall-drawing") {
            return "cursor-draw";
        }
        return "cursor-default";
    };

    return (
        <div 
            ref={containerRef} 
            className={`flex h-full overflow-hidden bg-white dark:bg-gray-900 ${getCursorClass()}`}
            style={{ 
                height: canvasHeight,
                position: 'relative'
            }}
        >
            <div 
                className="flex-1 relative"
                style={{ 
                width: canvasWidth,
                }}
            >
                {/* PixiJS 캔버스 */}
                <PixiCanvas />
            </div>
            
            <ToolbarMenu
                selectedTool={selectedTool}
                selectedMode={selectedMode}
                onToolSelect={handleToolSelect}
                onModeSelect={handleModeSelect}
            />
                
        </div>
    )
}

const PixiCanvas = () => {
  const parentRef = useRef(null);
  const { addCorner, addWallWithCorners, updateCorner, corners, walls, rooms, deleteRoom } = useArchisketch();
  const { selectedTool, selectedMode, drawingMode } = useTool();
  
  // 줌/팬 상태 관리
  const zoomPanState = useZoomPan();

  // PIXI Application 레벨에서 팬 처리 (컴포넌트 레벨에서 정의)
  const handleApplicationPan = useCallback((event) => {
    const { setIsDragging, setDragStart, setInitialPosition, position } = zoomPanState;
    
    // 커서 모드가 아니면 무시
    if (selectedTool !== "cursor") return;
    
    // 다른 인터랙티브 요소가 이미 처리했으면 무시
    if (event.target !== event.currentTarget) {
      console.log("🚫 다른 요소가 이벤트 처리함, 팬 무시");
      return;
    }

    console.log("🖱️ Application 레벨 팬 시작:", { 
      selectedTool,
      targetType: event.target?.constructor?.name
    });
    
    const originalEvent = event.data?.originalEvent;
    if (originalEvent && originalEvent.button !== 0) return;

    const clientX = event.data?.originalEvent?.clientX || event.clientX || 0;
    const clientY = event.data?.originalEvent?.clientY || event.clientY || 0;
    
    setDragStart({ x: clientX, y: clientY });
    setIsDragging(true);
    setInitialPosition({ x: position.x, y: position.y });
    document.body.style.cursor = 'grab';
    
    console.log("🖱️ PIXI Application 팬 드래그 시작");
  }, [selectedTool, zoomPanState]);
  
  // 코너 근처 감지 함수
  const findNearbyCorner = useCallback((point, threshold = 40) => {
    return corners.find(corner => {
      const distance = Math.sqrt(
        Math.pow(point.x - corner.position.x, 2) + 
        Math.pow(point.y - corner.position.z, 2)
      );
      return distance <= threshold;
    });
  }, [corners]);

  // 스냅 기능 - 가장 가까운 그리드 포인트나 코너로 스냅
  const snapToGridOrCorner = useCallback((point, gridSize = 40) => {
    // 먼저 코너 근처인지 확인 (더 관대한 거리)
    const nearbyCorner = findNearbyCorner(point, 60);
    if (nearbyCorner) {
      return {
        x: nearbyCorner.position.x,
        y: nearbyCorner.position.z,
        snappedTo: 'corner',
        corner: nearbyCorner
      };
    }

    // 그리드에 스냅
    const snappedX = Math.round(point.x / gridSize) * gridSize;
    const snappedY = Math.round(point.y / gridSize) * gridSize;
    
    return {
      x: snappedX,
      y: snappedY,
      snappedTo: 'grid'
    };
  }, [findNearbyCorner]);

  // 줌/팬 클릭 핸들러 (사용되지 않음 - handleApplicationPan으로 대체됨)
  const handleZoomPanClick = useCallback((event) => {
    console.log("⚠️ 사용되지 않는 함수 호출됨:", event);
  }, []);
  
  // 벽 그리기 상태 관리
  const [isDrawing, setIsDrawing] = useState(false);
  const [startCorner, setStartCorner] = useState(null);
  const [previewPoint, setPreviewPoint] = useState(null);
  const [snappedCorner, setSnappedCorner] = useState(null);
  const [isSnapped, setIsSnapped] = useState(false);
  



  const handleStageClick = useCallback((event) => {
    console.log("=== 통합 클릭 이벤트 ===");
    console.log("현재 도구:", selectedTool);
    console.log("이벤트 타겟:", event.target?.constructor?.name);
    console.log("이벤트 currentTarget:", event.currentTarget?.constructor?.name);
    console.log("stopPropagation 여부:", event.defaultPrevented);
    
    // 이 함수는 이제 드로우 모드 전용 (커서 모드는 handleApplicationPan에서 처리)
    
    // 벽 그리기 모드가 아닌 경우에도 클릭 이벤트는 발생하는지 확인
    if (selectedTool !== "wall-drawing" || selectedMode !== "draw") {
      console.log("벽 그리기 모드가 아님 - 클릭은 감지되지만 코너 생성 안함");
      return;
    }
    
    // 클릭 위치 가져오기 - 항상 캔버스 기준 좌표 사용
    const point = event.data.getLocalPosition(event.currentTarget.parent);
    
    if (!isDrawing) {
      // 첫 번째 클릭 - 시작점 생성 또는 기존 코너 재사용
      let startCornerToUse;
      
      // 스냅된 코너가 있으면 우선 사용
      if (snappedCorner) {
        console.log("스냅된 코너를 시작점으로 사용:", snappedCorner);
        startCornerToUse = snappedCorner;
      } else {
        const snappedPoint = snapToGridOrCorner(point);
        
        if (snappedPoint.snappedTo === 'corner') {
          // 기존 코너 재사용
          console.log("기존 코너 재사용:", snappedPoint.corner);
          startCornerToUse = snappedPoint.corner;
        } else {
          // 새 코너 생성 (그리드에 스냅)
          console.log("새 코너 생성 (그리드 스냅):", snappedPoint);
          startCornerToUse = addCorner({
            x: snappedPoint.x,
            y: 0,
            z: snappedPoint.y
          });
        }
      }
      
      setStartCorner(startCornerToUse);
      setIsDrawing(true);
    } else {
      // 두 번째 클릭 - 끝점 생성 및 벽 완성
      let endCornerToUse;
      
      // 스냅된 코너가 있고 시작점과 다른 경우 우선 사용
      if (snappedCorner && snappedCorner.archiId !== startCorner.archiId) {
        endCornerToUse = snappedCorner;
      } else {
        // 미리보기 포인트가 있으면 그 위치를 사용, 없으면 클릭 위치 사용
        const endPoint = previewPoint || point;
        const snappedEndPoint = snapToGridOrCorner(endPoint);
        
        if (snappedEndPoint.snappedTo === 'corner' && snappedEndPoint.corner.archiId !== startCorner.archiId) {
          // 기존 코너 재사용 (시작점과 다른 코너인 경우만)
          endCornerToUse = snappedEndPoint.corner;
        } else {
          endCornerToUse = addCorner({
            x: snappedEndPoint.x,
            y: 0,
            z: snappedEndPoint.y
          });
        }
      }
      
      // 벽 생성
      addWallWithCorners(startCorner, endCornerToUse);
      
      
      // 끝점을 새로운 시작점으로 설정 (연속 그리기)
      setStartCorner(endCornerToUse);
      setIsDrawing(true);
      setPreviewPoint(null);
      setSnappedCorner(null);
      setIsSnapped(false);
    }
  }, [selectedTool, selectedMode, addCorner, addWallWithCorners, isDrawing, startCorner, snappedCorner, previewPoint]);

  // 마우스 이동 이벤트 핸들러 (PixiJS 이벤트)
  const handleStageMouseMove = useCallback((event) => {
    if (!isDrawing || !startCorner) return;
    
    const point = event.data.getLocalPosition(event.currentTarget);
    const snappedPoint = snapToGridOrCorner(point);
    
    // 스냅된 포인트가 코너인지 확인
    if (snappedPoint.snappedTo === 'corner') {
      // 코너에 스냅된 경우 해당 코너의 정확한 위치 사용
      setPreviewPoint({ 
        x: snappedPoint.corner.position.x, 
        y: snappedPoint.corner.position.z 
      });
      
      // 스냅된 코너 정보 저장 (클릭 이벤트에서 사용)
      setSnappedCorner(snappedPoint.corner);
      setIsSnapped(true);
    } else {
      // 그리드에 스냅된 경우
      setPreviewPoint({ x: snappedPoint.x, y: snappedPoint.y });
      setSnappedCorner(null);
      setIsSnapped(false);
    }
  }, [isDrawing, startCorner, snapToGridOrCorner]);



  // ESC 키로 연속 그리기 중단
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isDrawing) {
        console.log("ESC 키로 연속 그리기 중단");
        setStartCorner(null);
        setIsDrawing(false);
        setPreviewPoint(null);
        setSnappedCorner(null);
        setIsSnapped(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawing]);

  // DOM 마우스 이벤트 제거 - PixiJS 이벤트만 사용

  return (
    <div 
      ref={parentRef}
      style={{ 
        width: '100%', 
        height: '100%',
        border: '2px solid red',
        backgroundColor: '#f0f0f0',
        position: 'relative'
      }}
    >
      <Application
        resizeTo={parentRef}
        backgroundColor={0xffffff}
        backgroundAlpha={1}
        antialias={true}
        resolution={1}
        autoDensity={false}
        hello={false}
        clearBeforeRender={true}
        autoStart={true}
        eventMode="static"
      >
          {/* 줌/팬 컨테이너 */}
          <pixiContainer
            scale={{ x: zoomPanState.scale, y: zoomPanState.scale }}
            position={zoomPanState.position}
          >
            {/* 그리드 (시각적 요소만) */}
            <PixiGrid zoomPanState={zoomPanState}/>
          
          {/* 클릭 가능한 배경 (벽 그리기용) - 그리드 전체 영역 */}
          <pixiGraphics
            draw={(graphics) => {
              graphics.clear();
              
              // 그리드와 같은 크기의 클릭 영역 생성
              const gridExtent = 50000;
              
              // 투명한 배경으로 클릭 영역 생성 (그리드 전체 커버)
              graphics.setFillStyle({ color: 0xffffff, alpha: 0 });
              graphics.rect(-gridExtent, -gridExtent, gridExtent * 2, gridExtent * 2);
              graphics.fill();
              
              console.log("🎯 클릭 영역 확장:", { 
                size: `${gridExtent * 2}x${gridExtent * 2}`,
                area: `(-${gridExtent}, -${gridExtent}) to (${gridExtent}, ${gridExtent})`
              });
            }}
            interactive={true} // 항상 활성
            buttonMode={selectedTool !== "cursor"}
            cursor={selectedTool === "cursor" ? "default" : "crosshair"}
            onPointerDown={selectedTool === "cursor" ? handleApplicationPan : handleStageClick}
            onPointerMove={handleStageMouseMove}
            zIndex={selectedTool !== "cursor" ? 50000 : -1000} // 드로우 모드에서만 높게
          />
        
        {/* Room들 렌더링 (벽보다 아래에) */}
        {rooms.map(room => {
          const roomCorners = room.corners.map(cornerId => 
            corners.find(c => c.archiId === cornerId)
          ).filter(Boolean);
          
          if (roomCorners.length < 3) {
            console.log('Room 렌더링 스킵 - 코너 부족:', room.archiId, roomCorners.length);
            return null;
          }
          
          // 코너들을 시계방향으로 정렬 (올바른 폴리곤 그리기를 위해)
          const sortedCorners = [...roomCorners].sort((a, b) => {
            const centerX = roomCorners.reduce((sum, c) => sum + c.position.x, 0) / roomCorners.length;
            const centerZ = roomCorners.reduce((sum, c) => sum + c.position.z, 0) / roomCorners.length;
            
            const angleA = Math.atan2(a.position.z - centerZ, a.position.x - centerX);
            const angleB = Math.atan2(b.position.z - centerZ, b.position.x - centerX);
            
            return angleA - angleB;
          });
          
          console.log(`Room ${room.archiId} 렌더링:`, sortedCorners.map(c => `${c.archiId}(${c.position.x},${c.position.z})`));
          
          return (
            <pixiGraphics
              key={room.archiId}
              draw={(graphics) => {
                graphics.clear();
                
                // Room 영역 채우기
                graphics.setFillStyle({ 
                  color: 0x3b82f6, // 파란색
                  alpha: 0.15 // 조금 더 진하게
                });
                
                // 폴리곤 그리기 (정렬된 순서로)
                graphics.moveTo(sortedCorners[0].position.x, sortedCorners[0].position.z);
                sortedCorners.slice(1).forEach(corner => {
                  graphics.lineTo(corner.position.x, corner.position.z);
                });
                graphics.closePath();
                graphics.fill();
                
                // Room 테두리
                graphics.setStrokeStyle({ 
                  color: 0x3b82f6, 
                  width: 1,
                  alpha: 0.4
                });
                graphics.stroke();
                
                // Room 라벨 (중심점에)
                const centerX = sortedCorners.reduce((sum, c) => sum + c.position.x, 0) / sortedCorners.length;
                const centerZ = sortedCorners.reduce((sum, c) => sum + c.position.z, 0) / sortedCorners.length;
                
                // Room ID 표시용 원
                graphics.setFillStyle({ color: 0x3b82f6, alpha: 0.8 });
                graphics.circle(centerX, centerZ, 6);
                graphics.fill();
                
                graphics.setFillStyle({ color: 0xffffff });
                graphics.circle(centerX, centerZ, 4);
                graphics.fill();
              }}
            />
          );
        })}

        {/* 벽들 렌더링 */}
        {walls.map(wall => {
          const startCorner = corners.find(c => c.archiId === wall.corners[0]);
          const endCorner = corners.find(c => c.archiId === wall.corners[1]);
          
          if (!startCorner || !endCorner) {
            return null;
          }
          
          return (
            <pixiGraphics
              key={wall.archiId}
              draw={(graphics) => {
                graphics.clear();
                graphics.setStrokeStyle({ 
                  color: 0x1f2937, // 진한 회색
                  width: 15,
                  alpha: 0.5
                });
                graphics.moveTo(startCorner.position.x, startCorner.position.z);
                graphics.lineTo(endCorner.position.x, endCorner.position.z);
                graphics.stroke();
              }}
            />
          );
        })}

        {/* 벽 드래그 오버레이들 렌더링 */}
        {walls.map(wall => (
          <Wall2DDragOverlay
            key={`drag-${wall.archiId}`}
            wall={wall}
            corners={corners}
          />
        ))}
        
        {/* 코너들 렌더링 - 벽 위에 표시 */}
        {corners.map(corner => (
          <React.Fragment key={corner.archiId}>
            <CornerComponent 
              corner={corner} 
              isSnapped={isSnapped}
              snappedCorner={snappedCorner}
              onCornerClick={(clickedCorner) => {
                if (!isDrawing) {
                  // 첫 번째 클릭 - 이 코너를 시작점으로 설정
                  setStartCorner(clickedCorner);
                  setIsDrawing(true);
                } else {
                  // 두 번째 클릭 - 이 코너를 끝점으로 설정
                  if (startCorner.archiId !== clickedCorner.archiId) {
                    console.log("코너에서 벽 그리기 완료:", { start: startCorner, end: clickedCorner });
                    
                    // 벽 생성
                    addWallWithCorners(startCorner, clickedCorner);
                    
                    // 끝점을 새로운 시작점으로 설정 (연속 그리기)
                    setStartCorner(clickedCorner);
                    setIsDrawing(true);
                    setPreviewPoint(null);
                    console.log("상태 초기화 완료");
                  } else {
                    console.log("같은 코너를 두 번 클릭함 - 무시");
                  }
                }
              }}
            />
            {/* VirtualCornerOverlay는 커서 모드일 때만 활성화됨 */}
            <VirtualCornerOverlay 
              corner={corner} 
              isSnapped={isSnapped}
            />
          </React.Fragment>
        ))}
        
        {/* 가상 노드 오버레이 제거됨 - 벽 드래그로 대체 */}
        

        
        {/* 미리보기 라인 */}
        {isDrawing && startCorner && previewPoint && (
          <pixiGraphics
            draw={(graphics) => {
              graphics.clear();
              graphics.setStrokeStyle({ 
                color: 0x8b5cf6, // 보라색
                width: 15,
                alpha: 0.8
              });
              graphics.moveTo(startCorner.position.x, startCorner.position.z);
              graphics.lineTo(previewPoint.x, previewPoint.y);
              graphics.stroke();
            }}
          />
        )}




        
        {/* 다음 포인트 미리보기 */}
        {isDrawing && previewPoint && (
          <pixiGraphics
            x={previewPoint.x}
            y={previewPoint.y}
            draw={(graphics) => {
              graphics.clear();
              // 외부 원 (보라색)
              graphics.setFillStyle({ color: 0x8b5cf6, alpha: 0.3 });
              graphics.circle(0, 0, 18);
              graphics.fill();
              
              // 내부 원 (흰색)
              graphics.setFillStyle({ color: 0xffffff });
              graphics.circle(0, 0, 12);
              graphics.fill();
              
              // 테두리
              graphics.setStrokeStyle({ color: 0x8b5cf6, width: 2 });
              graphics.circle(0, 0, 12);
              graphics.stroke();
              
              // 플러스 기호
              graphics.setStrokeStyle({ color: 0x8b5cf6, width: 2 });
              graphics.moveTo(-6, 0);
              graphics.lineTo(6, 0);
              graphics.moveTo(0, -6);
              graphics.lineTo(0, 6);
              graphics.stroke();
            }}
            interactive={true}
            buttonMode={true}
            cursor={selectedTool === "cursor" ? "default" : "crosshair"}
            onPointerDown={handleStageClick}
          />
        )}
          </pixiContainer>
        
        {/* 팬은 클릭 가능한 배경에서 처리 */}
          
          {/* 모드 상태 표시 (디버깅용) */}
          <pixiText
            x={10}
            y={10}
            text={`모드: ${selectedTool} | ${selectedMode} | interactive: ${selectedTool !== "cursor" ? "배경" : "오버레이"}`}
            style={{
              fontFamily: 'Arial',
              fontSize: 12,
              fill: selectedTool === "cursor" ? 0x10b981 : 0xe74c3c,
              fontWeight: 'bold'
            }}
            zIndex={200000}
          />
          
          {/* 줌/팬 상태 정보 */}
          <pixiText
            x={10}
            y={30}
            text={`줌: ${zoomPanState.scale.toFixed(2)}x | 위치: (${zoomPanState.position.x.toFixed(0)}, ${zoomPanState.position.y.toFixed(0)})`}
            style={{
              fontFamily: 'Arial',
              fontSize: 12,
              fill: 0x0066cc,
              align: 'left'
            }}
            zIndex={200000}
          />
          
          {/* 레이어 분리 안내 */}
          <pixiText
            x={10}
            y={50}
            text={`🏗️ 건축 요소: PIXI 그리드 레이어 | 🎮 줌/팬: 캔버스 레이어 (완전 분리)`}
            style={{
              fontFamily: 'Arial',
              fontSize: 11,
              fill: 0x666666,
              align: 'left'
            }}
            zIndex={200000}
          />
          
          {/* 조작 방법 안내 */}
          <pixiText
            x={10}
            y={70}
            text={`💡 휠: 줌 (항상) | 드래그: 팬 (커서모드) | 호버: 코너/벽 (항상)`}
            style={{
              fontFamily: 'Arial',
              fontSize: 11,
              fill: 0x888888,
              align: 'left'
            }}
            zIndex={200000}
          />
      </Application>
    </div>
  );
};

// 줌/팬 상태 관리 (전역)
const useZoomPan = () => {
  const { selectedTool } = useTool();
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isZoomDragging, setIsZoomDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialScale, setInitialScale] = useState(1);
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Shift 키 상태 추적
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };
    
    const handleKeyUp = (e) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 캔버스 레벨 휠 줌 이벤트 (항상 활성)
  useEffect(() => {
    const handleWheel = (event) => {
      // canvas 영역에서만 줌 동작
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const isOverCanvas = (
        event.clientX >= rect.left && 
        event.clientX <= rect.right &&
        event.clientY >= rect.top && 
        event.clientY <= rect.bottom
      );
      
      if (!isOverCanvas) return;
      
      event.preventDefault();
      
      console.log("🔍 캔버스 휠 이벤트:", { deltaY: event.deltaY, always: "활성" });
      
      const isZoomIn = event.deltaY < 0;
      const direction = isZoomIn ? 1 : -1;
      const factor = 1 + direction * 0.1;
      
      setScale(prevScale => {
        const newScale = Math.max(0.1, Math.min(5.0, prevScale * factor));
        
        if (newScale !== prevScale) {
          const mouseX = event.clientX - rect.left;
          const mouseY = event.clientY - rect.top;
          
          setPosition(prevPosition => {
            // 커서 위치를 월드 좌표로 변환 (줌 전)
            const worldX = (mouseX - prevPosition.x) / prevScale;
            const worldY = (mouseY - prevPosition.y) / prevScale;
            
            // 새로운 스케일에서 커서가 같은 월드 좌표를 가리키도록 위치 조정
            const newX = mouseX - worldX * newScale;
            const newY = mouseY - worldY * newScale;
            
            console.log("🎯 커서 기준 줌 계산:", {
              cursor: { x: mouseX, y: mouseY },
              worldPos: { x: worldX.toFixed(1), y: worldY.toFixed(1) },
              oldScale: prevScale.toFixed(2),
              newScale: newScale.toFixed(2),
              oldPosition: { x: prevPosition.x.toFixed(1), y: prevPosition.y.toFixed(1) },
              newPosition: { x: newX.toFixed(1), y: newY.toFixed(1) }
            });
            
            return { x: newX, y: newY };
          });
          
          console.log("🔍 캔버스 줌 적용:", { 
            delta: event.deltaY, 
            direction: isZoomIn ? "확대" : "축소",
            newScale: newScale.toFixed(2),
            cursorPos: { x: mouseX, y: mouseY }
          });
        }
        
        return newScale;
      });
    };

    // canvas 대신 document에 연결하여 더 안정적으로 처리
    document.addEventListener('wheel', handleWheel, { passive: false });
    console.log("✅ 캔버스 휠 이벤트 리스너 추가 (항상 활성)");
    return () => {
      document.removeEventListener('wheel', handleWheel);
      console.log("🗑️ 캔버스 휠 이벤트 리스너 제거");
    };
  }, []); // 의존성 없음 - 항상 활성

  // 전역 마우스 이벤트로 드래그 처리
  useEffect(() => {
    if (!isDragging && !isZoomDragging) return;

    const handleMouseMove = (event) => {
      if (isZoomDragging) {
        // 줌 모드
        const deltaY = dragStart.y - event.clientY;
        const zoomDelta = deltaY * 0.02;
        const newScale = Math.max(0.1, Math.min(5.0, initialScale + zoomDelta));
        setScale(newScale);
        console.log("🔍 드래그 줌 중:", { deltaY, newScale: newScale.toFixed(2) });
        
      } else if (isDragging) {
        // 팬 모드
        const deltaX = event.clientX - dragStart.x;
        const deltaY = event.clientY - dragStart.y;
        const newPosition = {
          x: initialPosition.x + deltaX,
          y: initialPosition.y + deltaY
        };
        setPosition(newPosition);
        document.body.style.cursor = 'grabbing';
        console.log("🖱️ 드래그 팬 중:", { deltaX, deltaY, newPosition });
      }
    };

    const handleMouseUp = () => {
      if (isZoomDragging) {
        setIsZoomDragging(false);
        console.log("🔍 드래그 줌 완료:", { finalScale: scale.toFixed(2) });
      }
      if (isDragging) {
        setIsDragging(false);
        console.log("🖱️ 드래그 팬 완료:", { finalPosition: position });
      }
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isZoomDragging, dragStart, initialScale, initialPosition, scale, position]);

  return {
    selectedTool, isShiftPressed, setIsShiftPressed,
    isDragging, setIsDragging, isZoomDragging, setIsZoomDragging,
    dragStart, setDragStart, initialScale, setInitialScale,
    initialPosition, setInitialPosition, scale, setScale,
    position, setPosition
  };
};

const PixiGrid = memo(({zoomPanState}) => {
  const { scale, position } = zoomPanState;
  const containerRef = useRef(null);

  // 그리드는 시각적 요소만 담당

  const gridDraw = useCallback((graphics) => {
    graphics.clear();
    
    // 엄청 큰 그리드 영역 (줌/팬을 고려한 여유 공간)
    const gridSize = 40;
    const gridExtent = 50000; // 매우 큰 그리드
    
    // 그리드 선 그리기
    graphics.setStrokeStyle({ 
      color: 0xcccccc, 
      width: 1,
      alpha: 0.5 
    });
    
    // 세로선 그리기
    for (let i = -gridExtent; i <= gridExtent; i += gridSize) {
      graphics.moveTo(i, -gridExtent);
      graphics.lineTo(i, gridExtent);
    }
    
    // 가로선 그리기
    for (let i = -gridExtent; i <= gridExtent; i += gridSize) {
      graphics.moveTo(-gridExtent, i);
      graphics.lineTo(gridExtent, i);
    }
    
    graphics.stroke();
  }, []);

  return (
    <pixiGraphics 
      draw={gridDraw}
      interactive={false}
      zIndex={-1000}
    />
  );
});

// 줌/팬 이벤트 처리 오버레이 (최상위)
const ZoomPanOverlay = memo(({zoomPanState}) => {
  const {
    selectedTool, isShiftPressed,
    isDragging, setIsDragging, isZoomDragging, setIsZoomDragging,
    setDragStart, setInitialScale, setInitialPosition, scale, position
  } = zoomPanState;

  const handlePointerDown = useCallback((event) => {
    console.log("🎯 줌/팬 백그라운드 클릭:", { 
      selectedTool, 
      isShiftPressed,
      targetType: event.target?.constructor?.name,
      currentTargetType: event.currentTarget?.constructor?.name,
      isSameTarget: event.target === event.currentTarget
    });
    
    // 커서 모드가 아니면 이벤트를 다른 요소에 전달
    if (selectedTool !== "cursor") {
      console.log("❌ 커서 모드가 아님, 줌/팬 이벤트 전달:", selectedTool);
      return; // stopPropagation 하지 않음
    }

    // 이미 다른 요소가 처리한 이벤트면 무시
    if (event.target !== event.currentTarget) {
      console.log("❌ 다른 요소가 이미 처리함, 줌/팬 무시");
      return;
    }

    const originalEvent = event.data?.originalEvent;
    if (originalEvent && originalEvent.button !== 0) return;

    // 확실히 빈 공간 클릭 - 줌/팬 시작
    console.log("✅ 빈 공간 확인됨 - 줌/팬 시작");
    event.stopPropagation();
    
    const clientX = event.data?.originalEvent?.clientX || event.clientX || 0;
    const clientY = event.data?.originalEvent?.clientY || event.clientY || 0;
    
    setDragStart({ x: clientX, y: clientY });
    
    if (isShiftPressed) {
      setIsZoomDragging(true);
      setInitialScale(scale);
      document.body.style.cursor = 'ns-resize';
      console.log("🔍 빈 공간에서 줌 드래그 시작");
    } else {
      setIsDragging(true);
      setInitialPosition({ x: position.x, y: position.y });
      document.body.style.cursor = 'grab';
      console.log("🖱️ 빈 공간에서 팬 드래그 시작");
    }
  }, [selectedTool, isShiftPressed, scale, position, setDragStart, setIsZoomDragging, setInitialScale, setIsDragging, setInitialPosition]);

  return (
    <pixiGraphics
      draw={(graphics) => {
        graphics.clear();
        
        // 커서 모드일 때만 낮은 우선순위 백그라운드 생성
        if (selectedTool === "cursor") {
          // 화면 전체 크기로 백그라운드 생성 (낮은 zIndex로 백그라운드 역할)
          const rect = document.querySelector('canvas')?.getBoundingClientRect();
          const width = rect?.width || 1000;
          const height = rect?.height || 800;
          
          // 매우 투명한 백그라운드 (이벤트 감지용)
          graphics.setFillStyle({ color: 0xffffff, alpha: 0.01 });
          graphics.rect(0, 0, width, height);
          graphics.fill();
          
          console.log("🎯 백그라운드 줌/팬 영역:", { width, height, zIndex: 500 });
        }
      }}
      interactive={selectedTool === "cursor"}
      buttonMode={false}
      onPointerDown={handlePointerDown}
      zIndex={selectedTool === "cursor" ? 500 : -100000} // 건축 요소들(1000+)보다 낮게
      hitArea={selectedTool === "cursor" ? (() => {
        const rect = document.querySelector('canvas')?.getBoundingClientRect();
        return { x: 0, y: 0, width: rect?.width || 1000, height: rect?.height || 800 };
      })() : null}
    />
  );
});

const Interior2ds = () => {
  return (
    <ArchisketchProvider>
      <ToolProvider>
        <Interior2dsContent />
      </ToolProvider>
    </ArchisketchProvider>
  );
};

export default Interior2ds;