import { useState, useEffect, useRef, useCallback } from "react";
import { useSidebar } from "../context/SidebarContext";
import ToolbarMenu from "../components/common/ToolbarMenu";
import { ArchisketchProvider, useArchisketch } from "../context/ArchisketchContext";
import { ToolProvider, useTool } from "../context/ToolContext";
import { Application, extend } from '@pixi/react';
import { Graphics } from 'pixi.js';

// Graphics를 pixiGraphics로 등록
extend({ Graphics });

// Interior2ds 내부 컴포넌트
const Interior2dsContent = () => {
    const { selectedTool, selectedMode, handleToolSelect, handleModeSelect } = useTool();
    const [canvasHeight, setCanvasHeight] = useState("100vh");
    const [canvasWidth, setCanvasWidth] = useState("100%");
    const containerRef = useRef(null);
    const { isExpanded, isHovered, isMobileOpen } = useSidebar();
    const { corners } = useArchisketch();

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

    return (
        <div 
            ref={containerRef} 
            className="flex h-full overflow-hidden bg-white dark:bg-gray-900" 
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
  const { addCorner, addWallWithCorners, updateCorner, corners, walls } = useArchisketch();
  const { selectedTool, selectedMode } = useTool();
  
  // 코너 근처 감지 함수
  const findNearbyCorner = useCallback((point, threshold = 20) => {
    return corners.find(corner => {
      const distance = Math.sqrt(
        Math.pow(point.x - corner.position.x, 2) + 
        Math.pow(point.y - corner.position.z, 2)
      );
      return distance <= threshold;
    });
  }, [corners]);

  // 스냅 기능 - 가장 가까운 그리드 포인트나 코너로 스냅
  const snapToGridOrCorner = useCallback((point, gridSize = 20) => {
    // 먼저 코너 근처인지 확인
    const nearbyCorner = findNearbyCorner(point, 30);
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
  
  // 벽 그리기 상태 관리
  const [isDrawing, setIsDrawing] = useState(false);
  const [startCorner, setStartCorner] = useState(null);
  const [previewPoint, setPreviewPoint] = useState(null);

  const handleStageClick = useCallback((event) => {
    console.log("=== 클릭 이벤트 발생 ===");
    console.log("이벤트:", event);
    console.log("현재 도구:", selectedTool);
    console.log("현재 모드:", selectedMode);
    
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
      
      setStartCorner(startCornerToUse);
      setIsDrawing(true);
      console.log("그리기 모드 활성화");
    } else {
      // 두 번째 클릭 - 끝점 생성 및 벽 완성
      
      // 미리보기 포인트가 있으면 그 위치를 사용, 없으면 클릭 위치 사용
      const endPoint = previewPoint || point;
      
      // 끝점도 스냅 기능 사용
      let endCornerToUse;
      const snappedEndPoint = snapToGridOrCorner(endPoint);
      
      if (snappedEndPoint.snappedTo === 'corner' && snappedEndPoint.corner.archiId !== startCorner.archiId) {
        // 기존 코너 재사용 (시작점과 다른 코너인 경우만)
        console.log("기존 코너를 끝점으로 재사용:", snappedEndPoint.corner);
        endCornerToUse = snappedEndPoint.corner;
      } else {
        // 새 코너 생성 (그리드에 스냅)
        console.log("새 끝 코너 생성 (그리드 스냅):", snappedEndPoint);
        endCornerToUse = addCorner({
          x: snappedEndPoint.x,
          y: 0,
          z: snappedEndPoint.y
        });
      }
      
      console.log("끝 코너:", endCornerToUse);
      
      // 벽 생성
      const newWall = addWallWithCorners(startCorner, endCornerToUse);
      console.log("벽 생성 완료:", newWall);
      
      // 상태 초기화
      setStartCorner(null);
      setIsDrawing(false);
      setPreviewPoint(null);
      console.log("상태 초기화 완료");
    }
  }, [selectedTool, selectedMode, addCorner, addWallWithCorners, isDrawing, startCorner]);

  // 코너 컴포넌트
  const CornerComponent = useCallback(({ corner, onCornerUpdate }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(null);
    const [dragOffset, setDragOffset] = useState(null);

    const handlePointerOver = useCallback(() => {
      console.log("코너 호버 시작:", corner.archiId);
      setIsHovered(true);
    }, [corner.archiId]);

    const handlePointerOut = useCallback(() => {
      console.log("코너 호버 종료:", corner.archiId);
      setIsHovered(false);
    }, [corner.archiId]);

    const handlePointerDown = useCallback((event) => {
      setIsDragging(true);
      const startPoint = event.data.getLocalPosition(event.currentTarget.parent);
      setDragStart(startPoint);
      setDragOffset({
        x: startPoint.x - corner.position.x,
        y: startPoint.y - corner.position.z
      });
    }, [corner]);

    const handlePointerMove = useCallback((event) => {
      if (!isDragging || !dragOffset) return;
      
      const currentPoint = event.data.getLocalPosition(event.currentTarget.parent);
      const newX = currentPoint.x - dragOffset.x;
      const newZ = currentPoint.y - dragOffset.y;
      
      // 미리보기용 임시 위치 계산 (실제 업데이트는 드래그 종료 시)
      setDragStart({ x: newX, z: newZ });
    }, [isDragging, dragOffset]);

    const handlePointerUp = useCallback(() => {
      if (isDragging && dragStart && typeof dragStart === 'object') {
        // 드래그 종료 시 실제 위치 업데이트
        onCornerUpdate(corner.archiId, {
          position: {
            x: dragStart.x,
            y: corner.position.y,
            z: dragStart.z
          }
        });
      }
      setIsDragging(false);
      setDragStart(null);
      setDragOffset(null);
    }, [isDragging, dragStart, corner, onCornerUpdate]);

    return (
      <pixiGraphics
        x={isDragging && dragStart && typeof dragStart === 'object' ? dragStart.x : corner.position.x}
        y={isDragging && dragStart && typeof dragStart === 'object' ? dragStart.z : corner.position.z}
        draw={(graphics) => {
          graphics.clear();
          
          // 호버 영역을 위한 큰 투명 원 (호버 감지용)
          graphics.setFillStyle({ color: 0xffffff, alpha: 0 });
          graphics.circle(0, 0, 20); // 20px 반지름으로 호버 영역 확장
          graphics.fill();
          
          // 호버 상태에 따른 색상 변경
          const fillColor = isHovered ? 0xf59e0b : 0xfbbf24; // 호버 시 더 진한 노란색
          const strokeColor = isHovered ? 0x92400e : 0x92400e;
          const strokeWidth = isHovered ? 3 : 2;
          const radius = isHovered ? 12 : 10; // 기본 크기도 약간 키움
          
          // 드래그 중일 때는 반투명하게 표시
          const alpha = isDragging ? 0.7 : 1;
          
          graphics.setFillStyle({ color: fillColor, alpha });
          graphics.circle(0, 0, radius);
          graphics.fill();
          
          // 테두리
          graphics.setStrokeStyle({ color: strokeColor, width: strokeWidth, alpha });
          graphics.circle(0, 0, radius);
          graphics.stroke();
        }}
        interactive={true}
        buttonMode={true}
        cursor={isDragging ? "grabbing" : "grab"}
        // onPointerOver={handlePointerOver}
        // onPointerOut={handlePointerOut}
        // onPointerDown={handlePointerDown}
        // onPointerMove={handlePointerMove}
        // onPointerUp={handlePointerUp}
      />
    );
  }, []);

  // 마우스 이동 이벤트 핸들러 (PixiJS 이벤트)
  const handleStageMouseMove = useCallback((event) => {
    if (!isDrawing || !startCorner) return;
    
    const point = event.data.getLocalPosition(event.currentTarget);
    const snappedPoint = snapToGridOrCorner(point);
    setPreviewPoint({ x: snappedPoint.x, y: snappedPoint.y });
  }, [isDrawing, startCorner, snapToGridOrCorner]);

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
        {/* 그리드 */}
        <pixiGraphics
          draw={(graphics) => {
            graphics.clear();
            
            // 부모 요소의 실제 크기 가져오기
            const rect = parentRef.current?.getBoundingClientRect();
            const width = rect?.width || 800;
            const height = rect?.height || 600;
            
            console.log('그리드 그리기:', width, height);
            
            const gridSize = 20;
            
            // 그리드 선 그리기 - PixiJS v8 문법
            graphics.setStrokeStyle({ 
              color: 0xcccccc, 
              width: 1,
              alpha: 0.5 
            });
            
            // 세로선 그리기
            for (let i = 0; i <= width / gridSize; i++) {
              graphics.moveTo(i * gridSize, 0);
              graphics.lineTo(i * gridSize, height);
            }
            
            // 가로선 그리기
            for (let i = 0; i <= height / gridSize; i++) {
              graphics.moveTo(0, i * gridSize);
              graphics.lineTo(width, i * gridSize);
            }
            
            graphics.stroke();
          }}
        />
        
        {/* 클릭 가능한 배경 */}
        <pixiGraphics
          draw={(graphics) => {
            graphics.clear();
            const rect = parentRef.current?.getBoundingClientRect();
            const width = rect?.width || 800;
            const height = rect?.height || 600;
            
            // 투명한 배경으로 클릭 영역 생성
            graphics.setFillStyle({ color: 0xffffff, alpha: 0 });
            graphics.rect(0, 0, width, height);
            graphics.fill();
          }}
          interactive={true}
          buttonMode={true}
          cursor="crosshair"
          onPointerDown={handleStageClick}
          onPointerMove={handleStageMouseMove}
        />
        
        {/* 벽들 렌더링 */}
        {walls.map(wall => {
          console.log("벽 렌더링:", wall);
          const startCorner = corners.find(c => c.archiId === wall.corners[0]);
          const endCorner = corners.find(c => c.archiId === wall.corners[1]);
          
          console.log("찾은 코너들:", { startCorner, endCorner });
          
          if (!startCorner || !endCorner) {
            console.log("코너를 찾을 수 없음, 벽 렌더링 스킵");
            return null;
          }
          
          return (
            <pixiGraphics
              key={wall.archiId}
              draw={(graphics) => {
                console.log("벽 그리기:", {
                  start: { x: startCorner.position.x, z: startCorner.position.z },
                  end: { x: endCorner.position.x, z: endCorner.position.z }
                });
                
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
        
        {/* 코너들 렌더링 - 벽 위에 표시 */}
        {corners.map(corner => (
          <CornerComponent 
            key={corner.archiId} 
            corner={corner} 
            onCornerUpdate={updateCorner}
          />
        ))}
        
        {/* 미리보기 라인 */}
        {isDrawing && startCorner && previewPoint && (
          <pixiGraphics
            draw={(graphics) => {
              console.log("미리보기 라인 렌더링:", {
                startCorner: startCorner.position,
                previewPoint,
                isDrawing
              });
              
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
              graphics.circle(0, 0, 12);
              graphics.fill();
              
              // 내부 원 (흰색)
              graphics.setFillStyle({ color: 0xffffff });
              graphics.circle(0, 0, 8);
              graphics.fill();
              
              // 테두리
              graphics.setStrokeStyle({ color: 0x8b5cf6, width: 2 });
              graphics.circle(0, 0, 8);
              graphics.stroke();
              
              // 플러스 기호
              graphics.setStrokeStyle({ color: 0x8b5cf6, width: 2 });
              graphics.moveTo(-4, 0);
              graphics.lineTo(4, 0);
              graphics.moveTo(0, -4);
              graphics.lineTo(0, 4);
              graphics.stroke();
            }}
            interactive={true}
            buttonMode={true}
            cursor="crosshair"
            onPointerDown={handleStageClick}
          />
        )}
      </Application>
    </div>
  );
};

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