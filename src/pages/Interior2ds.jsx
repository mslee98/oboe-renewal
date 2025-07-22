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
  
  // 벽 그리기 상태 관리
  const isDrawingRef = useRef(false);
  const cornersRef = useRef([]);
  const currentLineRef = useRef(null);
  const appInstanceRef = useRef(null);
  const [completedLines, setCompletedLines] = useState([]);
  const completedLinesRef = useRef([]); // 완성된 선들을 ref로 관리

  // 좌표 변환 함수 추가
  const getPixiCoordinates = useCallback((clientX, clientY) => {
    if (!appRef.current) return { x: 0, y: 0 };
    
    const canvas = appRef.current.canvas;
    const rect = canvas.getBoundingClientRect();
    
    // 캔버스의 실제 크기와 스타일 크기 비율 계산
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // 클라이언트 좌표를 캔버스 상대 좌표로 변환
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;
    
    return { x: canvasX, y: canvasY };
  }, []);

  // SVG 좌표 변환 함수 추가
  const getSvgCoordinates = useCallback((pixiX, pixiY) => {
    if (!appRef.current) return { x: 0, y: 0 };
    
    const canvas = appRef.current.canvas;
    const rect = canvas.getBoundingClientRect();
    
    // PixiJS 좌표를 SVG 좌표로 변환
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    
    const svgX = pixiX * scaleX;
    const svgY = pixiY * scaleY;
    
    return { x: svgX, y: svgY };
  }, []);

  useEffect(() => {
    // 이미 초기화되었다면 다시 초기화하지 않음
    if (isInitialized.current) return;

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

      // SVG 오버레이 생성
      const svgOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgOverlay.setAttribute("width", "100%");
      svgOverlay.setAttribute("height", "100%");
      svgOverlay.style.position = "absolute";
      svgOverlay.style.top = "0";
      svgOverlay.style.left = "0";
      svgOverlay.style.pointerEvents = "none";
      svgOverlay.style.zIndex = "10";
      svgOverlay.setAttribute("class", "MeasurementContainer__Container");

      container.appendChild(svgOverlay);
      svgOverlayRef.current = svgOverlay;

      // 클릭 이벤트 핸들러 수정 - 좌표 변환 적용
      const handleCanvasClick = (event) => {
        const pixiCoords = getPixiCoordinates(event.clientX, event.clientY);
        
        console.log('클릭 이벤트 발생!');
        console.log('클릭 위치 (클라이언트):', { x: event.clientX, y: event.clientY });
        console.log('클릭 위치 (PixiJS):', pixiCoords);
        console.log('현재 그리기 상태:', isDrawingRef.current);
        
        if (!isDrawingRef.current) {
          // 첫 번째 클릭 - 그리기 시작
          isDrawingRef.current = true;
          cornersRef.current = [pixiCoords];
          
          // 첫 번째 점 그리기
          const firstCorner = new Graphics();
          firstCorner
            .beginFill(0xfbbf24)
            .drawCircle(pixiCoords.x, pixiCoords.y, 8)
            .endFill();
          
          app.stage.addChild(firstCorner);
          console.log('첫 번째 클릭 - 그리기 시작, 위치:', pixiCoords);
        } else {
          // 두 번째 클릭 - 선 완성
          const startPoint = cornersRef.current[0];
          const endPoint = pixiCoords;
          
          console.log('시작점:', startPoint, '끝점:', endPoint);
          
          // 거리 계산
          const distance = Math.sqrt(
            Math.pow(endPoint.x - startPoint.x, 2) + 
            Math.pow(endPoint.y - startPoint.y, 2)
          );
          
          // 새로운 측정선 데이터 생성 - PixiJS 좌표 저장
          const newMeasurement = {
            id: `measurement-${Date.now()}`,
            pixiX1: startPoint.x,
            pixiY1: startPoint.y,
            pixiX2: endPoint.x,
            pixiY2: endPoint.y,
            distance: Math.round(distance),
            centerX: (startPoint.x + endPoint.x) / 2,
            centerY: (startPoint.y + endPoint.y) / 2
          };
          
          // 완성된 선을 상태에 추가
          setCompletedLines(prev => [...prev, newMeasurement]);
          
          // 첫 번째 점 제거
          if (app.stage.children.length > 1) {
            app.stage.removeChildAt(1);
          }
          
          // 그리기 상태 초기화
          isDrawingRef.current = false;
          cornersRef.current = [];
          
          console.log('두 번째 클릭 - 선 완성, 위치:', { startPoint, endPoint });
        }
      };

      // 마우스 이동 이벤트 핸들러 수정 - 좌표 변환 적용
      const handleMouseMove = (event) => {
        const pixiCoords = getPixiCoordinates(event.clientX, event.clientY);
        
        console.log('마우스 위치 (클라이언트):', { 
          clientX: event.clientX, 
          clientY: event.clientY
        });
        console.log('마우스 위치 (PixiJS):', pixiCoords);
        
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
          console.log('커서 원 위치:', pixiCoords);
        } else {
          // 그리기 모드일 때는 미리보기 선과 커서 원 표시
          if (cornersRef.current.length === 0) return;
          
          // 기존 미리보기 요소들 제거
          if (app.stage.children.length > 2) {
            while (app.stage.children.length > 2) {
              app.stage.removeChildAt(2);
            }
          }
          
          // 미리보기 선 그리기
          const previewGraphics = new Graphics();
          previewGraphics
            .moveTo(cornersRef.current[0].x, cornersRef.current[0].y)
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
          console.log('미리보기 선 위치:', { start: cornersRef.current[0], end: pixiCoords });
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

    initPixi().catch(error => {
      console.error('PixiJS 초기화 에러:', error);
    });

    return () => {
      if (appRef.current) {
        if (appRef.current.cleanup) {
          appRef.current.cleanup();
        }
        appRef.current.destroy(true);
        appRef.current = null;
      }
      isInitialized.current = false;
    };
  }, [getPixiCoordinates]); // 의존성 배열에 좌표 변환 함수 추가

  // 완성된 선들을 SVG로 렌더링 - 좌표 변환 적용
  useEffect(() => {
    if (!svgOverlayRef.current || !appRef.current) return;
    
    // 기존 SVG 측정선들 제거
    const existingMeasurements = svgOverlayRef.current.querySelectorAll('.wall-length-measurement');
    existingMeasurements.forEach(measurement => measurement.remove());
    
    // 새로운 측정선들 추가 (좌표 변환 적용)
    completedLines.forEach(line => {
      const measurementContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      measurementContainer.setAttribute("class", "MeasurementContainer__Container wall-length-measurement");
      measurementContainer.style.position = "absolute";
      measurementContainer.style.top = "0";
      measurementContainer.style.left = "0";
      measurementContainer.style.width = "100%";
      measurementContainer.style.height = "100%";
      measurementContainer.style.pointerEvents = "none";
      
      // PixiJS 좌표를 SVG 좌표로 변환
      const startSvgCoords = getSvgCoordinates(line.pixiX1, line.pixiY1);
      const endSvgCoords = getSvgCoordinates(line.pixiX2, line.pixiY2);
      const centerSvgCoords = getSvgCoordinates(line.centerX, line.centerY);
      
      // 메인 측정선
      const mainLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      mainLine.setAttribute("x1", startSvgCoords.x);
      mainLine.setAttribute("y1", startSvgCoords.y);
      mainLine.setAttribute("x2", endSvgCoords.x);
      mainLine.setAttribute("y2", endSvgCoords.y);
      mainLine.setAttribute("class", "MeasurementLine__Measurement");
      mainLine.style.stroke = "#4a5568";
      mainLine.style.strokeWidth = "8";
      mainLine.style.strokeLinecap = "round";
      
      // 시작점 노란색 원 (SVG)
      const startCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      startCircle.setAttribute("cx", startSvgCoords.x);
      startCircle.setAttribute("cy", startSvgCoords.y);
      startCircle.setAttribute("r", "8");
      startCircle.setAttribute("fill", "#fbbf24");
      startCircle.setAttribute("class", "MeasurementPoint__Point");
      
      // 끝점 노란색 원 (SVG)
      const endCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      endCircle.setAttribute("cx", endSvgCoords.x);
      endCircle.setAttribute("cy", endSvgCoords.y);
      endCircle.setAttribute("r", "8");
      endCircle.setAttribute("fill", "#fbbf24");
      endCircle.setAttribute("class", "MeasurementPoint__Point");
      
      // 측정 텍스트
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("dominant-baseline", "central");
      text.setAttribute("class", "MeasurementBox__Measurement");
      text.setAttribute("style", `transform: translate(${centerSvgCoords.x}px, ${centerSvgCoords.y}px) rotate(0rad); font-size: 15px; fill: #1f2937; font-family: Arial, sans-serif;`);
      text.textContent = `${line.distance}mm`;
      
      // 모든 요소를 컨테이너에 추가
      measurementContainer.appendChild(mainLine);
      measurementContainer.appendChild(startCircle);
      measurementContainer.appendChild(endCircle);
      measurementContainer.appendChild(text);
      
      svgOverlayRef.current.appendChild(measurementContainer);
    });
  }, [completedLines, getSvgCoordinates]);

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