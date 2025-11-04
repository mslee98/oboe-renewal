import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { useSidebar } from "../context/SidebarContext";
import ToolbarMenu from "../components/common/ToolbarMenu";
import { ArchisketchProvider, useArchisketch } from "../context/ArchisketchContext";
import { ToolProvider, useTool } from "../context/ToolContext";
import { Application, extend } from '@pixi/react';
import { Graphics, Container, Text, Rectangle, TextStyle, Point } from 'pixi.js';
import defaultCursor from '../assets/default-cursor.svg';
import drawCursor from '../assets/draw-cursor.svg';
import CornerComponent from '../components/Interior/CornerComponent';
import VirtualCornerOverlay from '../components/Interior/VirtualCornerOverlay';
import Wall2DDragOverlay from '../components/Interior/Wall2DDragOverlay';
import ZoomController from '../components/Interior/ZoomController';
import Interior3D from '../components/Interior/Interior3D';
import { logicalToPixel, pixelToLogical, METERS_PER_PIXEL } from '../utils/coordinateUtils';


// PIXI 컴포넌트들을 React 컴포넌트로 등록
extend({ Graphics, Container, Text });

// Rectangle도 extend에 추가 (hitArea 사용을 위해)
if (typeof Rectangle !== 'undefined') {
  // Rectangle은 직접 사용 가능
}

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
    const { corners, walls, rooms } = useArchisketch(); // 추가: 건축 데이터 가져오기

    const [is2D, setIs2D] = useState(true);

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

    // 3D 버튼 클릭 시 floorplans 데이터 생성 및 콘솔 출력
    const handle3DClick = () => {
        setIs2D(false);
        
        // floorplans 객체 생성
        const floorplans = {
            metadata: {
                createdAt: new Date().toISOString(),
                version: "1.0.0",
                totalCorners: corners.length,
                totalWalls: walls.length,
                totalRooms: rooms.length
            },
            corners: corners.map(corner => ({
                id: corner.archiId,
                position: {
                    x: corner.position.x,
                    y: corner.position.y || 0,
                    z: corner.position.z
                },
                type: "corner"
            })),
            walls: walls,
            rooms: rooms,
            statistics: {
                totalArea: rooms.reduce((sum, room) => sum + (room.area || 0), 0),
                averageWallLength: walls.length > 0 ? 
                    walls.reduce((sum, wall) => sum + wall.length, 0) / walls.length : 0,
                largestRoom: rooms.length > 0 ? 
                    rooms.reduce((largest, room) => 
                        (room.area || 0) > (largest.area || 0) ? room : largest
                    ) : null,
                boundingBox: calculateBoundingBox(corners)
            }
        };

        // 콘솔에 출력
        console.log("=".repeat(50));
        console.log("🏗️ FLOORPLANS DATA EXPORT");
        console.log("=".repeat(50));
        console.log(floorplans);
        console.log("=".repeat(50));
        console.log("📊 요약:");
        console.log(`- 코너: ${floorplans.metadata.totalCorners}개`);
        console.log(`- 벽: ${floorplans.metadata.totalWalls}개`);
        console.log(`- 방: ${floorplans.metadata.totalRooms}개`);
        console.log(`- 총 면적: ${floorplans.statistics.totalArea.toFixed(2)}`);
        console.log(`- 평균 벽 길이: ${floorplans.statistics.averageWallLength.toFixed(2)}`);
        console.log("=".repeat(50));
    };

    // 바운딩 박스 계산 함수
    const calculateBoundingBox = (corners) => {
        if (corners.length === 0) {
            return { min: { x: 0, z: 0 }, max: { x: 0, z: 0 }, width: 0, height: 0 };
        }

        const xValues = corners.map(c => c.position.x);
        const zValues = corners.map(c => c.position.z);
        
        const minX = Math.min(...xValues);
        const maxX = Math.max(...xValues);
        const minZ = Math.min(...zValues);
        const maxZ = Math.max(...zValues);

        return {
            min: { x: minX, z: minZ },
            max: { x: maxX, z: maxZ },
            width: maxX - minX,
            height: maxZ - minZ
        };
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
                {/* 조건부 렌더링 */}
                {is2D ? <PixiCanvas /> : <Interior3D />}
            </div>

            <div className="absolute bottom-6 left-1/12 transform -translate-x-1/2 z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg  flex items-center gap-1 shadow-lg border border-gray-200 dark:border-gray-700"> 
                    <button 
                        className={`p-2 rounded-md transition-colors flex items-center gap-1 ${
                            is2D ? 
                            "bg-blue-500 text-white" : 
                            "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`} 
                        onClick={() => setIs2D(true)}
                    >
                        2D
                    </button>
                    <button 
                        className={`p-2 rounded-md transition-colors flex items-center gap-1 ${
                            !is2D ? 
                            "bg-blue-500 text-white" : 
                            "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`} 
                        onClick={handle3DClick}
                    >
                        3D
                    </button>
                </div>
            </div>
            
            {/* ToolbarMenu는 2D에서만 표시 */}
            {is2D && (
                <ToolbarMenu
                    selectedTool={selectedTool}
                    selectedMode={selectedMode}
                    onToolSelect={handleToolSelect}
                    onModeSelect={handleModeSelect}
                />
            )}
                
        </div>
    )
}

const PixiCanvas = () => {
  const parentRef = useRef(null);
  const zoomPanContainerRef = useRef(null); // 줌/팬 컨테이너 ref
  const appRef = useRef(null); // Application ref
  const { addCorner, addWallWithCorners, updateCorner, corners, walls, rooms, deleteRoom, detectAndCreateRooms } = useArchisketch();
  const { selectedTool, selectedMode, drawingMode } = useTool();
  
  // 줌/팬 상태 관리
  const zoomPanState = useZoomPan();

  // Application stage에 직접 이벤트 리스너 추가 (오버레이 제거)
  
  // 코너 근처 감지 함수 (픽셀 좌표에서 논리적 단위 코너 찾기)
  const findNearbyCorner = useCallback((pixelPoint, threshold = 40) => {
    // 픽셀 좌표를 논리적 단위로 변환
    const logicalPoint = pixelToLogical({ x: pixelPoint.x, z: pixelPoint.y || pixelPoint.z });
    
    return corners.find(corner => {
      // 논리적 단위로 거리 계산
      const distance = Math.sqrt(
        Math.pow(logicalPoint.x - corner.position.x, 2) + 
        Math.pow(logicalPoint.z - corner.position.z, 2)
      );
      // threshold도 논리적 단위로 변환 (40px ≈ 1m)
      const logicalThreshold = threshold * METERS_PER_PIXEL;
      return distance <= logicalThreshold;
    });
  }, [corners]);

  // 스냅 기능 - 가장 가까운 그리드 포인트나 코너로 스냅 (픽셀 좌표 기준)
  const snapToGridOrCorner = useCallback((pixelPoint, gridSize = 40) => {
    // 먼저 코너 근처인지 확인 (더 관대한 거리)
    const nearbyCorner = findNearbyCorner(pixelPoint, 60);
    if (nearbyCorner) {
      // 논리적 단위 코너를 픽셀로 변환하여 반환
      const pixelCorner = logicalToPixel({ x: nearbyCorner.position.x, z: nearbyCorner.position.z });
      return {
        x: pixelCorner.x,
        y: pixelCorner.z,
        snappedTo: 'corner',
        corner: nearbyCorner
      };
    }

    // 그리드에 스냅 (픽셀 그리드)
    const snappedX = Math.round(pixelPoint.x / gridSize) * gridSize;
    const snappedY = Math.round((pixelPoint.y || pixelPoint.z) / gridSize) * gridSize;
    
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
  



  /**
   * 2D 캔버스 클릭 핸들러
   * - 벽 그리기 모드: 코너 생성 및 벽 그리기
   * - 줌/팬이 적용된 컨테이너 기준으로 좌표 변환
   */
  const handleStageClick = useCallback((event) => {
    // 벽 그리기 모드가 아니면 무시
    if (selectedTool !== "wall-drawing" || selectedMode !== "draw") {
      return;
    }
    
    console.log("🖱️ handleStageClick 호출됨", {
      selectedTool,
      selectedMode,
      isDrawing,
      eventTarget: event.target?.constructor?.name
    });
    
    // 줌/팬 컨테이너 기준으로 클릭 좌표 변환
    // PixiJS의 toLocal 메서드를 사용하여 정확한 좌표 변환
    let point;
    let debugInfo = {
      zoom: zoomPanState.scale,
      pan: { x: zoomPanState.position.x, y: zoomPanState.position.y }
    };
    
    if (zoomPanContainerRef.current) {
      const globalPoint = event.data.global;
      const container = zoomPanContainerRef.current;
      
      debugInfo.global = { x: globalPoint.x, y: globalPoint.y };
      debugInfo.containerPosition = { x: container.position.x, y: container.position.y };
      debugInfo.containerScale = { x: container.scale.x, y: container.scale.y };
      
      // toLocal을 사용하여 전역 좌표를 컨테이너의 로컬 좌표로 변환
      // 이는 scale과 position을 자동으로 고려합니다
      const localPoint = container.toLocal(globalPoint);
      point = localPoint;
      
      debugInfo.toLocalResult = { x: localPoint.x, y: localPoint.y };
    } else if (event.currentTarget?.parent) {
      // 없으면 parent 컨테이너 기준
      point = event.data.getLocalPosition(event.currentTarget.parent);
      debugInfo.method = 'getLocalPosition(parent)';
    } else {
      // 최후의 수단: 전역 좌표 사용
      point = event.data.global;
      debugInfo.method = 'global (fallback)';
      console.warn("⚠️ 줌/팬 컨테이너를 찾을 수 없음, 전역 좌표 사용");
    }
    
    debugInfo.rawPoint = { x: point.x, y: point.y };
    
    if (!isDrawing) {
      // 첫 번째 클릭 - 시작점 생성 또는 기존 코너 재사용
      let startCornerToUse;
      
      // 스냅된 코너가 있으면 우선 사용
      if (snappedCorner) {
        console.log("스냅된 코너를 시작점으로 사용:", snappedCorner);
        startCornerToUse = snappedCorner;
      } else {
        const snappedPoint = snapToGridOrCorner(point);
        
        debugInfo.snappedPoint = {
          x: snappedPoint.x,
          y: snappedPoint.y,
          snappedTo: snappedPoint.snappedTo
        };
        
        if (snappedPoint.snappedTo === 'corner') {
          // 기존 코너 재사용
          console.log("기존 코너 재사용:", snappedPoint.corner);
          startCornerToUse = snappedPoint.corner;
          debugInfo.action = 'reuse_corner';
          debugInfo.cornerId = snappedPoint.corner.archiId;
          debugInfo.cornerPosition = {
            logical: { x: snappedPoint.corner.position.x, z: snappedPoint.corner.position.z }
          };
        } else {
          // 새 코너 생성 (그리드에 스냅)
          const cornerInput = {
            x: snappedPoint.x,
            y: 0,
            z: snappedPoint.y
          };
          
          debugInfo.action = 'create_corner';
          debugInfo.cornerInput = cornerInput;
          
          // 픽셀 좌표인지 확인 (절댓값으로)
          const isInputPixel = Math.abs(cornerInput.x) > 100 || Math.abs(cornerInput.z) > 100;
          debugInfo.isInputPixel = isInputPixel;
          
          // 논리적 좌표로 변환된 값 확인
          const logicalCoords = pixelToLogical({ x: cornerInput.x, z: cornerInput.z });
          debugInfo.expectedLogical = logicalCoords;
          debugInfo.expectedPixel = cornerInput;
          
          startCornerToUse = addCorner(cornerInput);
          
          debugInfo.createdCorner = {
            id: startCornerToUse.archiId,
            position: startCornerToUse.position,
            actualLogical: { x: startCornerToUse.position.x, z: startCornerToUse.position.z }
          };
        }
        
        console.log("📌 코너 클릭 좌표 디버그:", JSON.parse(JSON.stringify(debugInfo)));
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
        
        debugInfo.endPoint = { x: endPoint.x, y: endPoint.y };
        debugInfo.snappedEndPoint = {
          x: snappedEndPoint.x,
          y: snappedEndPoint.y,
          snappedTo: snappedEndPoint.snappedTo
        };
        
        if (snappedEndPoint.snappedTo === 'corner' && snappedEndPoint.corner.archiId !== startCorner.archiId) {
          // 기존 코너 재사용 (시작점과 다른 코너인 경우만)
          endCornerToUse = snappedEndPoint.corner;
          debugInfo.action = 'reuse_end_corner';
          debugInfo.endCornerId = snappedEndPoint.corner.archiId;
        } else {
          const endCornerInput = {
            x: snappedEndPoint.x,
            y: 0,
            z: snappedEndPoint.y
          };
          
          debugInfo.action = 'create_end_corner';
          debugInfo.endCornerInput = endCornerInput;
          
          // 픽셀 좌표인지 확인 (절댓값으로)
          const isInputPixel = Math.abs(endCornerInput.x) > 100 || Math.abs(endCornerInput.z) > 100;
          debugInfo.isInputPixel = isInputPixel;
          
          const logicalCoords = pixelToLogical({ x: endCornerInput.x, z: endCornerInput.z });
          debugInfo.expectedLogical = logicalCoords;
          debugInfo.expectedPixel = endCornerInput;
          
          endCornerToUse = addCorner(endCornerInput);
          
          debugInfo.createdEndCorner = {
            id: endCornerToUse.archiId,
            position: endCornerToUse.position,
            actualLogical: { x: endCornerToUse.position.x, z: endCornerToUse.position.z }
          };
        }
        
        console.log("📌 끝점 클릭 좌표 디버그:", JSON.parse(JSON.stringify(debugInfo)));
      }
      
      // 벽 생성
      addWallWithCorners(startCorner, endCornerToUse);
      
      // 폐곡선 확인: 시작 코너로 돌아온 경우
      // useEffect에서 walls 변경 시 자동으로 룸 탐지됨
      
      // 끝점을 새로운 시작점으로 설정 (연속 그리기)
      setStartCorner(endCornerToUse);
      setIsDrawing(true);
      setPreviewPoint(null);
      setSnappedCorner(null);
      setIsSnapped(false);
    }
  }, [selectedTool, selectedMode, addCorner, addWallWithCorners, isDrawing, startCorner, snappedCorner, previewPoint, zoomPanContainerRef, zoomPanState]);

  // 마우스 이동 이벤트 핸들러 (PixiJS 이벤트)
  const handleStageMouseMove = useCallback((event) => {
    if (!isDrawing || !startCorner) {
      return;
    }
    
    console.log("🖱️ handleStageMouseMove 호출", { isDrawing, hasStartCorner: !!startCorner });
    
    // 줌/팬 컨테이너 기준으로 좌표 변환
    // PixiJS의 toLocal 메서드를 사용하여 정확한 좌표 변환
    let point;
    if (zoomPanContainerRef.current) {
      const globalPoint = event.data.global;
      const container = zoomPanContainerRef.current;
      
      // toLocal을 사용하여 전역 좌표를 컨테이너의 로컬 좌표로 변환
      const localPoint = container.toLocal(globalPoint);
      point = localPoint;
    } else if (event.currentTarget?.parent) {
      point = event.data.getLocalPosition(event.currentTarget.parent);
    } else {
      point = event.data.global;
    }
    const snappedPoint = snapToGridOrCorner(point);
    
    // 스냅된 포인트가 코너인지 확인
    if (snappedPoint.snappedTo === 'corner') {
      // 코너에 스냅된 경우: 코너의 논리적 단위를 픽셀로 변환
      const cornerPixel = logicalToPixel({ 
        x: snappedPoint.corner.position.x, 
        z: snappedPoint.corner.position.z 
      });
      setPreviewPoint({ 
        x: cornerPixel.x, 
        y: cornerPixel.z  // previewPoint는 {x, y} 형식 (y가 z 좌표)
      });
      
      // 스냅된 코너 정보 저장 (클릭 이벤트에서 사용)
      setSnappedCorner(snappedPoint.corner);
      setIsSnapped(true);
    } else {
      // 그리드에 스냅된 경우 (이미 픽셀 좌표)
      setPreviewPoint({ x: snappedPoint.x, y: snappedPoint.y });
      setSnappedCorner(null);
      setIsSnapped(false);
    }
  }, [isDrawing, startCorner, snapToGridOrCorner, zoomPanContainerRef]);



  // ESC 키로 연속 그리기 중단
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isDrawing) {
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

  return (
    <div 
      ref={parentRef}
      style={{ 
        width: '100%', 
        height: '100%',
        backgroundColor: '#f0f0f0',
        position: 'relative'
      }}
    >
      <Application
        ref={(app) => {
          appRef.current = app;
          // Application이 준비되면 stage 이벤트 확인
          if (app && app.stage) {
            console.log("✅ Application 준비됨", {
              stageInteractive: app.stage.interactive,
              stageEventMode: app.stage.eventMode
            });
          }
        }}
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
          {/* 줌/팬 컨테이너 - interactive를 true로 설정하여 이벤트 전파 허용 */}
          <pixiContainer
            ref={zoomPanContainerRef}
            scale={{ x: zoomPanState.scale, y: zoomPanState.scale }}
            position={zoomPanState.position}
            interactive={true}
            eventMode="static"
            // 컨테이너는 hitArea를 설정하지 않음 (자식 요소가 이벤트를 처리)
            onPointerMove={(event) => {
              // VirtualCornerOverlay가 드래그 중이면 무시
              if (event.target?.constructor?.name === 'Graphics' && event.target?.interactive) {
                // 코너나 다른 요소가 처리 중이면 무시
                return;
              }
              
              // 벽 그리기 모드에서 미리보기 처리 (컨테이너 레벨에서 처리하여 모든 자식 요소에서도 작동)
              if (selectedTool === "wall-drawing" && selectedMode === "draw" && isDrawing && startCorner) {
                handleStageMouseMove(event);
              }
            }}
          >
            {/* 배경 클릭 감지용 투명 레이어 - PixiJS 문서에 따라 간단하게 설정 */}
            <pixiGraphics
              key="background-layer"
              draw={(graphics) => {
                graphics.clear();
                // 충분히 큰 영역을 그려서 전체 캔버스를 커버
                const extent = 100000;
                // alpha를 0.01로 설정하여 실제로 렌더링되도록 함 (hitArea 작동을 위해)
                graphics.setFillStyle({ color: 0xffffff, alpha: 0.01 });
                graphics.rect(-extent, -extent, extent * 2, extent * 2);
                graphics.fill();
              }}
              interactive={true}
              buttonMode={false}
              eventMode="static"
              cursor={selectedTool === "cursor" ? "default" : (selectedTool === "wall-drawing" && selectedMode === "draw" ? "crosshair" : "default")}
              onPointerOver={(event) => {
                console.log("🎯 배경 레이어 호버 시작", { selectedTool });
              }}
              onPointerOut={(event) => {
                console.log("👋 배경 레이어 호버 종료");
              }}
              onPointerDown={(event) => {
                console.log("🖱️ 배경 레이어 포인터 다운", { selectedTool, selectedMode });
                
                // 코너나 다른 요소가 처리했으면 무시
                if (event.target !== event.currentTarget) {
                  return;
                }
                
                if (selectedTool === "cursor") {
                  // 커서 모드: 팬 드래그
                  const { setIsDragging, setDragStart, setInitialPosition, position } = zoomPanState;
                  const clientX = event.data?.originalEvent?.clientX || event.data?.global?.x || 0;
                  const clientY = event.data?.originalEvent?.clientY || event.data?.global?.y || 0;
                  
                  setDragStart({ x: clientX, y: clientY });
                  setIsDragging(true);
                  setInitialPosition({ x: position.x, y: position.y });
                  document.body.style.cursor = 'grabbing';
                } else if (selectedTool === "wall-drawing" && selectedMode === "draw") {
                  // 벽 그리기 모드: 배경 클릭
                  handleStageClick(event);
                }
              }}
              // onPointerMove는 컨테이너 레벨에서 처리하므로 여기서는 제거
              zIndex={-10000}
              hitArea={new Rectangle(-100000, -100000, 200000, 200000)}
            />
            
            {/* 그리드 (시각적 요소만) */}
            <PixiGrid zoomPanState={zoomPanState}/>
        
        {/* Room들 렌더링 (벽보다 아래에) */}
        {rooms.map(room => {
          const roomCorners = room.corners.map(cornerId => 
            corners.find(c => c.archiId === cornerId)
          ).filter(Boolean);
          
          if (roomCorners.length < 3) {
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
          
          // 논리적 단위 → 픽셀 변환된 코너들
          const pixelCorners = sortedCorners.map(corner => 
            logicalToPixel({ x: corner.position.x, z: corner.position.z })
          );
          
          return (
            <pixiGraphics
              key={room.archiId}
              draw={(graphics) => {
                graphics.clear();
                
                // Room 영역 채우기
                graphics.setFillStyle({ 
                  color: 0x60a5fa, // 더 밝은 파란색
                  alpha: 0.35 // 더 진하게 보이도록
                });
                
                // 폴리곤 그리기 (픽셀 좌표로 변환된 순서로)
                graphics.moveTo(pixelCorners[0].x, pixelCorners[0].z);
                pixelCorners.slice(1).forEach(pixelCorner => {
                  graphics.lineTo(pixelCorner.x, pixelCorner.z);
                });
                graphics.closePath();
                graphics.fill();
                
                // Room 테두리
                graphics.setStrokeStyle({ 
                  color: 0x3b82f6, // 진한 파란색 테두리
                  width: 2,
                  alpha: 0.7 // 더 명확하게
                });
                graphics.stroke();
                
                // Room 라벨 (중심점에 - 픽셀 좌표 계산)
                const centerX = pixelCorners.reduce((sum, c) => sum + c.x, 0) / pixelCorners.length;
                const centerZ = pixelCorners.reduce((sum, c) => sum + c.z, 0) / pixelCorners.length;
                
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
          
          // 논리적 단위 → 픽셀 변환
          const startPixel = logicalToPixel({ x: startCorner.position.x, z: startCorner.position.z });
          const endPixel = logicalToPixel({ x: endCorner.position.x, z: endCorner.position.z });
          
          // 벽의 길이 계산 (논리적 단위 - 미터)
          const dx = endCorner.position.x - startCorner.position.x;
          const dz = endCorner.position.z - startCorner.position.z;
          const wallLength = Math.sqrt(dx * dx + dz * dz);
          
          // 벽의 중점 계산 (픽셀 좌표)
          const midX = (startPixel.x + endPixel.x) / 2;
          const midZ = (startPixel.z + endPixel.z) / 2;
          
          // 벽의 각도 계산 (라디안)
          const angle = Math.atan2(endPixel.z - startPixel.z, endPixel.x - startPixel.x);
          
          // 텍스트가 항상 읽기 가능한 방향으로 표시되도록 각도 조정
          // 각도가 -90도 ~ 90도 범위를 벗어나면 180도 뒤집어서 표시
          // 이렇게 하면 텍스트가 항상 위쪽에서 읽을 수 있는 방향으로 표시됨
          let textAngle = angle;
          if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
            // 각도가 90도를 넘거나 -90도보다 작으면 180도 회전
            textAngle = angle + Math.PI;
            // 각도를 -PI ~ PI 범위로 정규화
            if (textAngle > Math.PI) textAngle -= 2 * Math.PI;
            if (textAngle < -Math.PI) textAngle += 2 * Math.PI;
          }
          
          // 치수 표시 형식 (소수점 제거 가능한 경우)
          const displayLength = wallLength % 1 === 0 
            ? `${wallLength.toFixed(0)}m` 
            : `${wallLength.toFixed(2)}m`;
          
          return (
            <React.Fragment key={wall.archiId}>
              {/* 벽 선 */}
              <pixiGraphics
                draw={(graphics) => {
                  graphics.clear();
                  graphics.setStrokeStyle({ 
                    color: 0x1f2937, // 진한 회색
                    width: 15,
                    alpha: 0.5
                  });
                  
                  graphics.moveTo(startPixel.x, startPixel.z);
                  graphics.lineTo(endPixel.x, endPixel.z);
                  graphics.stroke();
                }}
              />
              
              {/* 화면 고정 크기 라벨 (줌에 영향 없음) */}
              {(() => {
                // 전체 코너 픽셀 기준의 대략적인 중심(실내 중심)
                const centerPixel = corners.reduce((acc, c) => {
                  const p = logicalToPixel({ x: c.position.x, z: c.position.z });
                  acc.x += p.x; acc.y += p.z; return acc;
                }, { x: 0, y: 0 });
                if (corners.length > 0) { centerPixel.x /= corners.length; centerPixel.y /= corners.length; }

                // 바깥쪽으로 오프셋 벡터(중심의 반대 방향)
                const vx = midX - centerPixel.x;
                const vy = midZ - centerPixel.y;
                const vlen = Math.max(1, Math.hypot(vx, vy));
                const nx = vx / vlen;
                const ny = vy / vlen;
                const offset = 24; // 픽셀 고정 오프셋
                const labelX = midX + nx * offset;
                const labelY = midZ + ny * offset;
                const invScale = 1 / Math.max(0.001, zoomPanState.scale);

                return (
                  <pixiContainer x={labelX} y={labelY} scale={{ x: invScale, y: invScale }} eventMode="none">
                    <pixiGraphics
                      draw={(g) => {
                        g.clear();
                        const padding = 6;
                        const w = (displayLength.length * 8) + padding * 2;
                        const h = 20;
                        g.setFillStyle({ color: 0x111827, alpha: 0.85 });
                        g.beginPath();
                        g.roundRect(-w / 2, -h / 2, w, h, 6);
                        g.closePath();
                        g.fill();
                      }}
                    />
                    <pixiText
                      text={displayLength}
                      anchor={0.5}
                      style={new TextStyle({
                        fontFamily: 'Arial, sans-serif',
                        fontSize: 14,
                        fill: 0xffffff,
                        fontWeight: 'bold'
                      })}
                    />
                  </pixiContainer>
                );
              })()}

              {/* 기존 벽 위 치수 표시는 제거됨 (외측 라벨만 유지) */}
            </React.Fragment>
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
          <CornerComponent 
            key={corner.archiId}
            corner={corner} 
            onCornerClick={(clickedCorner) => {
              /**
               * 코너 클릭 핸들러 - 최소 기능만
               * 
               * 동작:
               * 1. 첫 클릭: 시작점 설정
               * 2. 두 번째 클릭: 벽 생성 및 연속 그리기
               * 3. 폐곡선 완성 시 룸 탐지
               */
              if (!isDrawing) {
                // 첫 번째 클릭 - 시작점 설정
                setStartCorner(clickedCorner);
                setIsDrawing(true);
              } else {
                // 두 번째 클릭 - 벽 생성
                if (startCorner.archiId !== clickedCorner.archiId) {
                  // 벽 생성
                  addWallWithCorners(startCorner, clickedCorner);
                  
                  // 연속 그리기: 끝점을 새로운 시작점으로
                  setStartCorner(clickedCorner);
                  setIsDrawing(true);
                  setPreviewPoint(null);
                } else {
                  // 폐곡선 완성 (시작 코너와 같은 코너 클릭)
                  // 벽 생성은 이미 handleStageClick에서 처리됨
                  // 여기서는 중복 호출 방지를 위해 아무것도 하지 않음
                }
              }
            }}
            />
          ))}
          
        {/* VirtualCornerOverlay는 커서 모드일 때만 활성화 (코너 호버 방해 안 함) */}
        {selectedTool === "cursor" && corners.map(corner => (
          <VirtualCornerOverlay 
            key={`virtual-${corner.archiId}`}
            corner={corner} 
            isSnapped={isSnapped}
          />
        ))}
        
        {/* 가상 노드 오버레이 제거됨 - 벽 드래그로 대체 */}
        

        
        {/* 미리보기 라인 */}
        {isDrawing && startCorner && previewPoint && (() => {
          // 시작 코너를 논리적 단위에서 픽셀로 변환
          const startPixel = logicalToPixel({ 
            x: startCorner.position.x, 
            z: startCorner.position.z 
          });
          
          return (
            <pixiGraphics
              draw={(graphics) => {
                graphics.clear();
                graphics.setStrokeStyle({ 
                  color: 0x8b5cf6, // 보라색
                  width: 15,
                  alpha: 0.8
                });
                // 픽셀 좌표로 통일하여 그리기
                graphics.moveTo(startPixel.x, startPixel.z);
                graphics.lineTo(previewPoint.x, previewPoint.y);
                graphics.stroke();
              }}
            />
          );
        })()}




        
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
            text={`건축 요소: PIXI 그리드 레이어 | 줌/팬: 캔버스 레이어 (완전 분리)`}
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
            text={`휠: 줌 (항상) | 드래그: 팬 (커서모드) | 호버: 코너/벽 (항상)`}
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
      event.stopPropagation();
      
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
            
            return { x: newX, y: newY };
          });
        }
        
        return newScale;
      });
    };

    // document에 연결하여 항상 처리
    document.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => {
      document.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, [setScale, setPosition]); // 함수만 의존성으로

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
  }, [isDragging, isZoomDragging, dragStart, initialScale, initialPosition, scale, position, setScale, setPosition, setIsDragging, setIsZoomDragging]);

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

// ZoomPanOverlay 제거됨 - Application stage에서 직접 처리

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