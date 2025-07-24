import { useState, useEffect, useRef, useCallback } from "react";
import { useSidebar } from "../context/SidebarContext";
import ToolbarMenu from "../components/common/ToolbarMenu";
import { ArchisketchProvider, useArchisketch } from "../context/ArchisketchContext";
import { ToolProvider, useTool } from "../context/ToolContext";
import { Application, extend } from '@pixi/react';
import { Graphics } from 'pixi.js';
import defaultCursor from '../assets/default-cursor.svg';
import drawCursor from '../assets/draw-cursor.svg';
import CornerComponent from '../components/CornerComponent';

// Graphics를 pixiGraphics로 등록
extend({ Graphics });

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
  const { addCorner, addWallWithCorners, updateCorner, corners, walls } = useArchisketch();
  const { selectedTool, selectedMode, drawingMode } = useTool();
  
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
  
  // 벽 그리기 상태 관리
  const [isDrawing, setIsDrawing] = useState(false);
  const [startCorner, setStartCorner] = useState(null);
  const [previewPoint, setPreviewPoint] = useState(null);
  const [snappedCorner, setSnappedCorner] = useState(null);
  const [isSnapped, setIsSnapped] = useState(false);
  
  // 가상 코너 드래그 관련 상태
  const [isDragging, setIsDragging] = useState(false);
  const [virtualCorner, setVirtualCorner] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);


  const handleStageClick = useCallback((event) => {
    console.log("=== 클릭 이벤트 발생 ===");
    console.log("현재 도구:", selectedTool);
    console.log("현재 모드:", selectedMode);
    console.log("그리기 모드:", drawingMode);
    
    // 커서 모드일 때는 클릭 이벤트 무시
    if (selectedTool === "cursor") {
      console.log("커서 모드 - 클릭 이벤트 무시");
      return;
    }
    
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

  // 가상 코너 드래그 시작 핸들러
  const handleDragStart = useCallback((corner) => {
    console.log("가상 코너 드래그 시작:", corner.archiId, corner.position);
    
    // 가상 코너 생성
    const virtualCornerData = {
      archiId: corner.archiId,
      position: { x: corner.position.x, y: corner.position.y, z: corner.position.z },
      isVirtual: true
    };
    
    console.log("생성된 가상 코너:", virtualCornerData);
    
    setVirtualCorner(virtualCornerData);
    setDragTarget(corner);
    setIsDragging(true);
  }, []);

  // 가상 코너 드래그 이동 핸들러
  const handleDragMove = useCallback((event) => {
    if (isDragging && virtualCorner && selectedTool === "cursor") {
      const newPosition = event.data.getLocalPosition(event.currentTarget.parent);
      
      console.log("드래그 이벤트 좌표:", {
        global: event.data.global,
        local: event.data.getLocalPosition(event.currentTarget),
        parentLocal: event.data.getLocalPosition(event.currentTarget.parent),
        newPosition
      });
      
      // 가상 코너 위치 업데이트
      setVirtualCorner({
        ...virtualCorner,
        position: { x: newPosition.x, y: virtualCorner.position.y, z: newPosition.y }
      });
      
      console.log("가상 코너 드래그 중:", virtualCorner.archiId, newPosition);
    }
  }, [isDragging, virtualCorner, selectedTool]);

  // 가상 코너 드래그 종료 핸들러
  const handleDragEnd = useCallback(() => {
    if (isDragging && virtualCorner && dragTarget) {
      console.log("가상 코너 드래그 종료:", dragTarget.archiId, virtualCorner.position);
      
      // 실제 코너 위치를 가상 코너 위치로 업데이트
      updateCorner(dragTarget.archiId, {
        position: {
          x: virtualCorner.position.x,
          y: dragTarget.position.y,
          z: virtualCorner.position.z
        }
      });
      
      // 상태 초기화
      setIsDragging(false);
      setVirtualCorner(null);
      setDragTarget(null);
    }
  }, [isDragging, virtualCorner, dragTarget, updateCorner]);

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
        {/* 그리드 */}
        <PixiGrid parentRef={parentRef}/>
        
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
          cursor={selectedTool === "cursor" ? "default" : "crosshair"}
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
            onDragStart={handleDragStart}
            isDragging={isDragging}
            dragTarget={dragTarget}
          />
        ))}
        
        {/* 가상 코너 렌더링 */}
        {isDragging && virtualCorner && (() => {
          console.log("가상 코너 렌더링:", virtualCorner.position);
          return (
            <pixiGraphics
              x={virtualCorner.position.x}
              y={virtualCorner.position.z}
              draw={(graphics) => {
                graphics.clear();
                
                // 호버 영역을 위한 큰 투명 원 (호버 감지용)
                graphics.setFillStyle({ color: 0xffffff, alpha: 0 });
                graphics.circle(0, 0, 30);
                graphics.fill();
                
                // 가상 코너는 반투명하게 표시
                const fillColor = 0xf59e0b;
                const strokeColor = 0x92400e;
                const strokeWidth = 3;
                const radius = 13;
                const alpha = 0.7;
                
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
              cursor="grabbing"
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerUpOutside={handleDragEnd}
            />
          );
        })()}
        
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



        {/* 드래그 미리보기 벽들 */}
        {/* {dragTarget && dragPreviewWalls.length > 0 && (
          <>
                          {console.log("드래그 미리보기 렌더링:", { dragTarget, dragPreviewWalls })}
            {dragPreviewWalls.map(wall => {
              const otherCornerId = wall.corners.find(id => id !== dragTarget.archiId);
              const otherCorner = corners.find(c => c.archiId === otherCornerId);
              
              if (!otherCorner) return null;
              
              return (
                <pixiGraphics
                  key={`preview-${wall.archiId}`}
                  draw={(graphics) => {
                    console.log("드래그 미리보기 벽 그리기:", {
                      wall,
                      otherCorner: otherCorner.position,
                      previewStart: wall.previewStart,
                      previewEnd: wall.previewEnd
                    });
                    
                    graphics.clear();
                    graphics.setStrokeStyle({ 
                      color: 0x3b82f6, // 파란색
                      width: 15,
                      alpha: 0.6
                    });
                    
                    // previewStart에서 previewEnd로 선 그리기
                    graphics.moveTo(wall.previewStart.x, wall.previewStart.z);
                    graphics.lineTo(wall.previewEnd.x, wall.previewEnd.z);
                    graphics.stroke();
                  }}
                />
              );
            })}
          </>
        )} */}
        
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
      </Application>
    </div>
  );
};

const PixiGrid = ({parentRef}) => {
  return (
    <pixiGraphics
          draw={(graphics) => {
            graphics.clear();
            
            // 부모 요소의 실제 크기 가져오기
            const rect = parentRef.current?.getBoundingClientRect();
            const width = rect?.width || 800;
            const height = rect?.height || 600;
            
            console.log('그리드 그리기:', width, height);
            
            const gridSize = 40;
            
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
  )
}

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