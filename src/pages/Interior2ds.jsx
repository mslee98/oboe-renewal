import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSidebar } from "../context/SidebarContext";
import ToolbarMenu from "../components/common/ToolbarMenu";
import { ArchisketchProvider, useArchisketch } from "../context/ArchisketchContext";
import { ToolProvider, useTool } from "../context/ToolContext";

import { Application, Graphics, Text } from 'pixi.js';



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
  const canvasRef = useRef(null);
  const svgOverlayRef = useRef(null);
  const appRef = useRef(null);
  const isInitialized = useRef(false);
  const initPromiseRef = useRef(null); // 초기화 Promise 추적
  
  // 벽 그리기 상태 관리
  const isDrawingRef = useRef(false);
  const cornersRef = useRef([]);
  const currentLineRef = useRef(null);
  const appInstanceRef = useRef(null);
  const [completedLines, setCompletedLines] = useState([]);
  const completedLinesRef = useRef([]); // 완성된 선들을 ref로 관리

  // SVG 코너 드래그 관련 상태
  const [draggedCornerId, setDraggedCornerId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // ArchisketchContext에서 필요한 함수들 가져오기
  const { addCorner, addWallWithCorners, corners, walls, updateCorner, selectCorner } = useArchisketch();

  // 좌표 변환 함수 - 의존성 배열 비움
  const getPixiCoordinates = useCallback((clientX, clientY) => {
    if (!appRef.current) return { x: 0, y: 0 };
    
    const canvas = appRef.current.canvas;
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;
    
    return { x: canvasX, y: canvasY };
  }, []); // ✅ 빈 의존성 배열

  // SVG 좌표 변환 함수 - 의존성 배열 비움
  const getSvgCoordinates = useCallback((pixiX, pixiY) => {
    if (!appRef.current) return { x: 0, y: 0 };
    
    const canvas = appRef.current.canvas;
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    
    const svgX = pixiX * scaleX;
    const svgY = pixiY * scaleY;
    
    return { x: svgX, y: svgY };
  }, []); // ✅ 빈 의존성 배열

  // SVG 오버레이 생성 함수
  const createSvgOverlay = () => {
    // 기존 SVG 오버레이 제거
    const existingOverlays = container.querySelectorAll('.MeasurementContainer__Container');
    existingOverlays.forEach(overlay => {
      console.log('기존 SVG 오버레이 제거:', overlay);
      container.removeChild(overlay);
    });

    const svgOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgOverlay.setAttribute("width", "100%");
    svgOverlay.setAttribute("height", "100%");
    svgOverlay.style.position = "absolute";
    svgOverlay.style.top = "0";
    svgOverlay.style.left = "0";
    svgOverlay.style.pointerEvents = "none";
    svgOverlay.style.zIndex = "10";
    svgOverlay.setAttribute("class", "MeasurementContainer__Container");

    console.log('새 SVG 오버레이 생성됨:', svgOverlay);

    container.appendChild(svgOverlay);
    svgOverlayRef.current = svgOverlay;

    console.log('SVG 오버레이 DOM에 추가됨');
    console.log('현재 container의 SVG 개수:', container.querySelectorAll('.MeasurementContainer__Container').length);
  };

  // PixiJS 초기화 - 더 강력한 중복 방지
  useEffect(() => {
    console.log('=== PixiJS 초기화 useEffect 실행 ===');
    console.log('isInitialized.current:', isInitialized.current);
    console.log('initPromiseRef.current:', initPromiseRef.current);
    
    // 이미 초기화 중이거나 완료되었다면 스킵
    if (isInitialized.current || initPromiseRef.current) {
      console.log('이미 초기화됨 또는 초기화 중, 스킵');
      return;
    }

    console.log('PixiJS 초기화 시작');

    const initPixi = async () => {
      if (!canvasRef.current) {
        console.log('canvasRef가 없음');
        return;
      }

      console.log('PixiJS 초기화 시작');

      // 기존 앱이 있다면 정리
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }

      const container = canvasRef.current;
      const rect = container.getBoundingClientRect();
      
      console.log('컨테이너 rect:', rect);
      
      const computedStyle = getComputedStyle(container);
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
      
      const actualWidth = rect.width - paddingLeft - paddingRight;
      const actualHeight = rect.height - paddingTop - paddingBottom;

      console.log('계산된 크기:', {
        rectWidth: rect.width,
        rectHeight: rect.height,
        actualWidth,
        actualHeight,
        padding: { paddingLeft, paddingRight, paddingTop, paddingBottom }
      });

      if (actualWidth <= 0 || actualHeight <= 0) {
        console.log('유효하지 않은 크기:', actualWidth, actualHeight);
        return;
      }

      console.log('PixiJS 초기화:', {
        actualWidth,
        actualHeight
      });

      const app = new Application();

      await app.init({
        width: Math.floor(actualWidth),
        height: Math.floor(actualHeight),
        backgroundColor: 0xffffff,
        antialias: true,
        resolution: 1,
        autoDensity: false,
      });

      console.log('PixiJS 앱 생성 완료');

      // 기존 캔버스 제거
      const existingCanvas = container.querySelector('canvas');
      if (existingCanvas) {
        container.removeChild(existingCanvas);
        console.log('기존 캔버스 제거됨');
      }

      // 새 캔버스 추가
      container.appendChild(app.canvas);
      appRef.current = app;
      appInstanceRef.current = app;

      console.log('캔버스 DOM에 추가됨');

      app.canvas.style.width = '100%';
      app.canvas.style.height = '100%';
      app.canvas.style.display = 'block';
      app.canvas.style.cursor = 'crosshair';
      app.canvas.style.pointerEvents = 'auto';

      console.log('캔버스 크기:', { 
        canvasWidth: app.canvas.width, 
        canvasHeight: app.canvas.height,
        styleWidth: app.canvas.style.width,
        styleHeight: app.canvas.style.height,
        actualWidth,
        actualHeight
      });

      // 그리드 생성 함수 (PixiJS 8버전 문법)
      const buildGrid = (graphics) => {
        const gridSize = 20; // 20px 간격
        
        // 세로선 그리기
        for (let i = 0; i <= actualWidth / gridSize; i++) {
          graphics
            .moveTo(i * gridSize, 0)
            .lineTo(i * gridSize, actualHeight);
        }

        // 가로선 그리기
        for (let i = 0; i <= actualHeight / gridSize; i++) {
          graphics
            .moveTo(0, i * gridSize)
            .lineTo(actualWidth, i * gridSize);
        }

        return graphics;
      };

      // 그리드 생성 (테스트용 - 매우 진한 색상)
      const gridGraphics = buildGrid(new Graphics()).stroke({ 
        color: 0x666666, // 진한 회색
        pixelLine: true, 
        width: 2, // 굵은 선
        alpha: 1.0 // 완전 불투명
      });

      app.stage.addChild(gridGraphics);
      console.log('그리드가 stage에 추가됨');

      // 완성된 선 그리기 함수 수정
      const drawCompletedLine = (start, end) => {
        const lineGraphics = new Graphics();
        const lineWidth = 8;
        const circleRadius = lineWidth;
        
        // 메인 선
        lineGraphics
          .moveTo(start.x, start.y)
          .lineTo(end.x, end.y)
          .stroke({ 
            color: 0x4a5568, 
            width: lineWidth,
            alpha: 1.0
          });

        // 양 끝 핸들 (노란색 원)
        lineGraphics
          .beginFill(0xfbbf24)
          .drawCircle(start.x, start.y, circleRadius)
          .drawCircle(end.x, end.y, circleRadius)
          .endFill();

        app.stage.addChild(lineGraphics);
        console.log('완성된 선 추가됨');
      };

      // SVG 오버레이 생성 부분 수정 (기존 코드 내부에서)
      // 기존 SVG 오버레이 제거
      const existingOverlays = container.querySelectorAll('.MeasurementContainer__Container');
      existingOverlays.forEach(overlay => {
        console.log('기존 SVG 오버레이 제거:', overlay);
        container.removeChild(overlay);
      });

      const svgOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgOverlay.setAttribute("width", "100%");
      svgOverlay.setAttribute("height", "100%");
      svgOverlay.style.position = "absolute";
      svgOverlay.style.top = "0";
      svgOverlay.style.left = "0";
      svgOverlay.style.pointerEvents = "none";
      svgOverlay.style.zIndex = "10";
      svgOverlay.setAttribute("class", "MeasurementContainer__Container");

      console.log('새 SVG 오버레이 생성됨:', svgOverlay);

      container.appendChild(svgOverlay);
      svgOverlayRef.current = svgOverlay;

      console.log('SVG 오버레이 DOM에 추가됨');
      console.log('현재 container의 SVG 개수:', container.querySelectorAll('.MeasurementContainer__Container').length);

      // 클릭 이벤트 핸들러 수정 - addCorner 사용
      const handleCanvasClick = (event) => {
        const pixiCoords = getPixiCoordinates(event.clientX, event.clientY);
        
        if (!isDrawingRef.current) {
          
          // 첫 번째 점을 ArchisketchContext에 추가
          const firstCorner = addCorner({
            x: pixiCoords.x,
            y: 0, // 2D에서는 y=0
            z: pixiCoords.y // PixiJS의 y를 z로 매핑
          });

          cornersRef.current = [firstCorner];
          isDrawingRef.current = true;
          
          // 첫 번째 점 그리기
          const firstCornerGraphics = new Graphics();
          firstCornerGraphics
            .beginFill(0xfbbf24)
            .drawCircle(pixiCoords.x, pixiCoords.y, 8)
            .endFill();
          
          app.stage.addChild(firstCornerGraphics);
          console.log('첫 번째 클릭 - 코너 생성:', firstCorner);
        } else {

          // 두 번째 클릭 - 선 완성
          const startCorner = cornersRef.current[0];
          const endCorner = addCorner({
            x: pixiCoords.x,
            y: 0,
            z: pixiCoords.y
          });
          
          console.log('시작 코너:', startCorner);
          console.log('끝 코너:', endCorner);
          console.log('현재 corners 상태:', corners);

          const wall = addWallWithCorners(startCorner, endCorner);

          if (wall) {
            console.log('벽 생성 성공:', wall);
          } else {
            console.error('벽 생성 실패');
          }
          
          console.log('addWall 호출 후, wall:', wall);
          // 거리 계산
          // const distance = Math.sqrt(
          //   Math.pow(endPoint.x - startPoint.x, 2) + 
          //   Math.pow(endPoint.y - startPoint.y, 2)
          // );
          
          // 새로운 측정선 데이터 생성 - PixiJS 좌표 저장
          // const newMeasurement = {
          //   id: `measurement-${Date.now()}`,
          //   pixiX1: startPoint.x,
          //   pixiY1: startPoint.y,
          //   pixiX2: endPoint.x,
          //   pixiY2: endPoint.y,
          //   distance: Math.round(distance),
          //   centerX: (startPoint.x + endPoint.x) / 2,
          //   centerY: (startPoint.y + endPoint.y) / 2,
          //   startCornerId: cornersRef.current[0].archiId, // 시작점 corner ID 저장
          //   endCornerId: endCorner.archiId // 끝점 corner ID 저장
          // };
          
          // 완성된 선을 상태에 추가
          // setCompletedLines(prev => [...prev, newMeasurement]);
    
          
          // 첫 번째 점 제거 -- 이거 왜 제거하는거였지?
          if (app.stage.children.length > 1) {
            app.stage.removeChildAt(1);
          }
          
          // 그리기 상태 초기화
          isDrawingRef.current = false;
          cornersRef.current = [];
        }
      };

      // 마우스 이동 이벤트 핸들러 수정 - 좌표 변환 적용
      const handleMouseMove = (event) => {
        const pixiCoords = getPixiCoordinates(event.clientX, event.clientY);
        
        // 현재 선 업데이트
        currentLineRef.current = pixiCoords;
        
        if (!isDrawingRef.current) {
          // 그리기 모드가 아닐 때는 커서 원만 표시
          // 기존 커서 원 제거
          if (app.stage.children.length > 1) {
            const cursorIndex = app.stage.children.findIndex(child => 
              child !== gridGraphics && child !== app.stage.children[app.stage.children.length - 1]
            );
            if (cursorIndex > 0) {
              app.stage.removeChildAt(cursorIndex);
            }
          }
          
          // 새로운 커서 원 그리기
          const cursorCircle = new Graphics();
          cursorCircle
            .beginFill(0xfbbf24, 0.5)
            .drawCircle(pixiCoords.x, pixiCoords.y, 4)
            .endFill();
          
          app.stage.addChild(cursorCircle);
        } else {
          // 그리기 모드일 때는 미리보기 선과 커서 원 표시
          if (cornersRef.current.length === 0) return;
          
          // 기존 미리보기 요소들 제거
          if (app.stage.children.length > 2) {
            while (app.stage.children.length > 2) {
              app.stage.removeChildAt(2);
            }
          }
          
          // 미리보기 선 그리기 - Corner 객체의 position 참조
          const startCorner = cornersRef.current[0];
          const previewGraphics = new Graphics();
          previewGraphics
            .moveTo(startCorner.position.x, startCorner.position.z) // position 참조
            .lineTo(pixiCoords.x, pixiCoords.y)
            .stroke({ 
              color: 0x3b82f6,
              width: 8,
              alpha: 0.7
            });
          
          // 커서 원 그리기
          const cursorCircle = new Graphics();
          cursorCircle
            .beginFill(0xfbbf24, 0.8)
            .drawCircle(pixiCoords.x, pixiCoords.y, 8)
            .endFill();
          
          app.stage.addChild(previewGraphics);
          app.stage.addChild(cursorCircle);
        }
      };

      // 이벤트 리스너 등록
      app.canvas.addEventListener('click', handleCanvasClick);
      app.canvas.addEventListener('mousemove', handleMouseMove);

      console.log('이벤트 리스너 등록 완료');

      // 클린업 함수 저장
      appRef.current.cleanup = () => {
        app.canvas.removeEventListener('click', handleCanvasClick);
        app.canvas.removeEventListener('mousemove', handleMouseMove);
      };

      // 강제 렌더링
      app.renderer.render(app.stage);
      console.log('강제 렌더링 완료');

      isInitialized.current = true;
      console.log('PixiJS 초기화 완료');
    };

    // 초기화 Promise 저장
    initPromiseRef.current = initPixi().catch(error => {
      console.error('PixiJS 초기화 에러:', error);
      initPromiseRef.current = null; // 에러 시 Promise 초기화
    });

    return () => {
      console.log('PixiJS 정리 시작');
      if (appRef.current) {
        if (appRef.current.cleanup) {
          appRef.current.cleanup();
        }
        appRef.current.destroy(true);
        appRef.current = null;
      }
      isInitialized.current = false;
      initPromiseRef.current = null; // Promise 초기화
    };
  }, []); // ✅ 빈 의존성 배열

  
  // 완성된 선들을 SVG로 렌더링 - 드래그 기능 추가
  useEffect(() => {
    console.log('=== 벽 렌더링 useEffect 실행 ===');
    
    if (!svgOverlayRef.current || !appRef.current) {
      console.log('조건 불만족으로 리턴');
      return;
    }
    
    // 기존 SVG 측정선들 제거
    const existingWalls = svgOverlayRef.current.querySelectorAll('.wall-line');
    console.log('기존 벽 요소 개수:', existingWalls.length);
    existingWalls.forEach(wall => wall.remove());
    
    // 새로운 측정선들 추가 (좌표 변환 적용)
    walls.forEach((wall, index) => {
      console.log("###############", wall)
      console.log(`벽 ${index} 처리:`, wall);

      if (!wall.corners || wall.corners.length !== 2) {
        console.log('벽에 corners 배열이 없거나 2개가 아님:', wall.corners);
        return;
      }



      const startCornerId = wall.corners[0];
      const endCornerId = wall.corners[1];

      const startCorner = corners.find(c => c.archiId === startCornerId);
      const endCorner = corners.find(c => c.archiId === endCornerId);
      
      if (!startCorner || !endCorner) {
        console.log('벽의 코너가 없음, 스킵');
        return;
      }
      
      // PixiJS 좌표를 SVG 좌표로 변환
      const startSvgCoords = getSvgCoordinates(startCorner.position.x, startCorner.position.z);
      const endSvgCoords = getSvgCoordinates(endCorner.position.x, endCorner.position.z);
      const centerSvgCoords = getSvgCoordinates(
        (startCorner.position.x + endCorner.position.x) / 2,
        (startCorner.position.z + endCorner.position.z) / 2
      );

      // SVG 벽 요소 생성
      const wallLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      wallLine.setAttribute("x1", startSvgCoords.x);
      wallLine.setAttribute("y1", startSvgCoords.y);
      wallLine.setAttribute("x2", endSvgCoords.x);
      wallLine.setAttribute("y2", endSvgCoords.y);
      wallLine.setAttribute("class", "wall-line");
      wallLine.style.stroke = "#4a5568";
      wallLine.style.strokeWidth = "8";
      wallLine.style.strokeLinecap = "round";
      
      // 시작점 원 (드래그 가능)
      const startCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      startCircle.setAttribute("cx", startSvgCoords.x);
      startCircle.setAttribute("cy", startSvgCoords.y);
      startCircle.setAttribute("r", "8");
      startCircle.setAttribute("fill", "#fbbf24");
      startCircle.setAttribute("class", "corner-circle");
      startCircle.setAttribute("data-corner-id", startCorner.archiId);
      startCircle.style.cursor = "pointer";
      startCircle.style.transition = "all 0.2s ease";
      
      // 끝점 원 (드래그 가능)
      const endCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      endCircle.setAttribute("cx", endSvgCoords.x);
      endCircle.setAttribute("cy", endSvgCoords.y);
      endCircle.setAttribute("r", "8");
      endCircle.setAttribute("fill", "#fbbf24");
      endCircle.setAttribute("class", "corner-circle");
      endCircle.setAttribute("data-corner-id", endCorner.archiId);
      endCircle.style.cursor = "pointer";
      endCircle.style.transition = "all 0.2s ease";
      
      // 측정 텍스트
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", centerSvgCoords.x);
      text.setAttribute("y", centerSvgCoords.y - 15);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("style", "font-size: 12px; fill: #1f2937; font-weight: bold;");
      text.textContent = `${Math.round(wall.length)}mm`;
      
      // 모든 요소를 컨테이너에 추가
      const wallContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
      wallContainer.setAttribute("class", "wall-container");
      wallContainer.appendChild(wallLine);
      wallContainer.appendChild(startCircle);
      wallContainer.appendChild(endCircle);
      wallContainer.appendChild(text);
      
      svgOverlayRef.current.appendChild(wallContainer);
    });
  }, [walls, getSvgCoordinates, corners]);

  // SVG 코너 드래그 이벤트 핸들러
  useEffect(() => {
    if (!svgOverlayRef.current) return;

    const handleCornerMouseDown = (event) => {
      const cornerCircle = event.target;
      const cornerId = cornerCircle.getAttribute('data-corner-id');
      
      if (!cornerId) return;
      
      console.log('코너 드래그 시작:', cornerId);
      setDraggedCornerId(cornerId);
      setIsDragging(true);
      selectCorner(cornerId);
      
      // 드래그 중 시각적 피드백
      cornerCircle.setAttribute('r', '12');
      cornerCircle.setAttribute('fill', '#f59e0b');
    };

    const handleCornerMouseUp = (event) => {
      if (!isDragging) return;
      
      console.log('코너 드래그 종료');
      setDraggedCornerId(null);
      setIsDragging(false);
      
      // 모든 코너 원을 원래 상태로 복원
      const cornerCircles = svgOverlayRef.current.querySelectorAll('.corner-circle');
      cornerCircles.forEach(circle => {
        circle.setAttribute('r', '8');
        circle.setAttribute('fill', '#fbbf24');
      });
    };

    const handleCornerMouseMove = (event) => {
      if (!isDragging || !draggedCornerId) return;
      
      const svgElement = svgOverlayRef.current;
      const rect = svgElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      console.log('코너 드래그 중:', { x, y });
      
      // SVG 좌표를 PixiJS 좌표로 변환
      const canvas = appRef.current.canvas;
      const canvasRect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / canvasRect.width;
      const scaleY = canvas.height / canvasRect.height;
      
      const pixiX = x * scaleX;
      const pixiY = y * scaleY;
      
      // 코너 위치 업데이트
      updateCorner(draggedCornerId, {
        position: {
          x: pixiX,
          y: 0,
          z: pixiY
        }
      });
      
      // 드래그 중인 코너 원 위치 업데이트
      const draggedCircle = svgOverlayRef.current.querySelector(`[data-corner-id="${draggedCornerId}"]`);
      if (draggedCircle) {
        draggedCircle.setAttribute('cx', x);
        draggedCircle.setAttribute('cy', y);
      }
    };

    const handleCornerMouseEnter = (event) => {
      if (isDragging) return;
      
      const cornerCircle = event.target;
      cornerCircle.setAttribute('r', '10');
      cornerCircle.setAttribute('fill', '#f59e0b');
    };

    const handleCornerMouseLeave = (event) => {
      if (isDragging) return;
      
      const cornerCircle = event.target;
      cornerCircle.setAttribute('r', '8');
      cornerCircle.setAttribute('fill', '#fbbf24');
    };

    // 이벤트 리스너 등록
    const cornerCircles = svgOverlayRef.current.querySelectorAll('.corner-circle');
    cornerCircles.forEach(circle => {
      circle.addEventListener('mousedown', handleCornerMouseDown);
      circle.addEventListener('mouseenter', handleCornerMouseEnter);
      circle.addEventListener('mouseleave', handleCornerMouseLeave);
    });

    // 전역 마우스 이벤트
    document.addEventListener('mousemove', handleCornerMouseMove);
    document.addEventListener('mouseup', handleCornerMouseUp);

    return () => {
      // 이벤트 리스너 정리
      cornerCircles.forEach(circle => {
        circle.removeEventListener('mousedown', handleCornerMouseDown);
        circle.removeEventListener('mouseenter', handleCornerMouseEnter);
        circle.removeEventListener('mouseleave', handleCornerMouseLeave);
      });
      
      document.removeEventListener('mousemove', handleCornerMouseMove);
      document.removeEventListener('mouseup', handleCornerMouseUp);
    };
  }, [isDragging, draggedCornerId, updateCorner, selectCorner, svgOverlayRef.current]);

  // 코너 상태 변화 감지 및 로깅
  useEffect(() => {
    console.log('현재 관리되는 코너들:', corners);
    console.log('현재 관리되는 벽들:', walls);
  }, [corners, walls]);

  // 컴포넌트 마운트/언마운트 추적
  useEffect(() => {
    console.log('=== PixiCanvas 컴포넌트 마운트 ===');
    return () => {
      console.log('=== PixiCanvas 컴포넌트 언마운트 ===');
    };
  }, []);

  // getPixiCoordinates 함수 생성 추적
  useEffect(() => {
    console.log('=== getPixiCoordinates 함수 재생성됨 ===');
  }, [getPixiCoordinates]);

  // PixiJS 초기화 내부에 코너 드래그 기능 추가
  const createDraggableCorner = (corner) => {
    const cornerGraphics = new Graphics();
    cornerGraphics
      .beginFill(0xfbbf24)
      .drawCircle(0, 0, 8)
      .endFill();
    
    cornerGraphics.position.set(corner.position.x, corner.position.z);
    cornerGraphics.interactive = true;
    cornerGraphics.buttonMode = true;
    
    // 드래그 이벤트
    cornerGraphics.on('pointerdown', (event) => {
      console.log('코너 드래그 시작:', corner.archiId);
      selectCorner(corner.archiId);
    });
    
    cornerGraphics.on('pointermove', (event) => {
      if (cornerGraphics.dragging) {
        const newPosition = event.data.getLocalPosition(cornerGraphics.parent);
        console.log('코너 드래그 중:', newPosition);
        
        // 코너 위치 업데이트
        updateCorner(corner.archiId, {
          position: {
            x: newPosition.x,
            y: 0,
            z: newPosition.y
          }
        });
        
        // 그래픽 위치 업데이트
        cornerGraphics.position.set(newPosition.x, newPosition.y);
      }
    });
    
    cornerGraphics.on('pointerup', () => {
      console.log('코너 드래그 종료');
      cornerGraphics.dragging = false;
    });
    
    return cornerGraphics;
  };

  return (
    <div 
      ref={canvasRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        border: '2px solid red',
        backgroundColor: '#f0f0f0',
        padding: '0',
        margin: '0',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden'
      }} 
    />
  );
};

const Interior2ds = () => {
    return (
      <ToolProvider>
        <ArchisketchProvider>
            <Interior2dsContent />
        </ArchisketchProvider>
      </ToolProvider>
    );
};

export default Interior2ds;