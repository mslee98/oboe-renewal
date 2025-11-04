import React, { useState, useCallback, useRef } from 'react';
import { useTool } from '../../context/ToolContext';

const ZoomController = ({ children }) => {
  const { selectedTool } = useTool();
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isZoomDragging, setIsZoomDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialScale, setInitialScale] = useState(1);
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const containerRef = useRef(null);

  // 줌 설정
  const MIN_SCALE = 0.1;
  const MAX_SCALE = 5.0;
  const ZOOM_SENSITIVITY = 0.02; // 드래그 감도 증가 (더 빠른 반응)

  // Shift 키 상태 추적
  React.useEffect(() => {
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

  const handlePointerDown = useCallback((event) => {
    console.log("🎯 줌컨트롤러 포인터 다운:", { 
      selectedTool, 
      isShiftPressed, 
      targetName: event.target?.constructor?.name,
      currentTargetName: event.currentTarget?.constructor?.name,
      isBackgroundClick: event.target === event.currentTarget
    });
    
    if (selectedTool !== "cursor") {
      console.log("❌ 커서 모드가 아님:", selectedTool);
      return;
    }

    // 배경 클릭이 아닌 경우(다른 interactive 요소 클릭) 무시
    if (event.target !== event.currentTarget) {
      console.log("❌ 배경이 아닌 다른 요소 클릭, 팬/줌 무시");
      return;
    }

    // 좌클릭만 처리 (우클릭 제외)
    const originalEvent = event.data?.originalEvent;
    if (originalEvent && originalEvent.button !== 0) {
      console.log("❌ 좌클릭이 아님:", originalEvent.button);
      return;
    }

    console.log("✅ 배경 클릭 확인, 팬/줌 드래그 시작");
    
    event.stopPropagation();
    
    // DOM 좌표로 통일 (브라우저 호환성)
    const clientX = event.data?.originalEvent?.clientX || event.clientX || 0;
    const clientY = event.data?.originalEvent?.clientY || event.clientY || 0;
    
    console.log("📍 드래그 시작 좌표:", { clientX, clientY });
    setDragStart({ x: clientX, y: clientY });
    
    if (isShiftPressed) {
      // Shift + 좌클릭 드래그: 줌 모드
      setIsZoomDragging(true);
      setInitialScale(scale);
      document.body.style.cursor = 'ns-resize';
      console.log("🔍 줌 드래그 시작:", { scale, startPos: { x: clientX, y: clientY } });
    } else {
      // 좌클릭 드래그: 팬 모드  
      setIsDragging(true);
      setInitialPosition({ x: position.x, y: position.y });
      document.body.style.cursor = 'grab';
      console.log("🖱️ 팬 드래그 시작:", { position, startPos: { x: clientX, y: clientY } });
    }
  }, [selectedTool, isShiftPressed, scale, position]);

  // 전역 마우스 이벤트로 드래그 처리
  React.useEffect(() => {
    if (!isDragging && !isZoomDragging) return;

    const handleMouseMove = (event) => {
      if (isZoomDragging) {
        // 줌 모드: ngraph 스타일 줌
        const deltaY = dragStart.y - event.clientY;
        const zoomDelta = deltaY * ZOOM_SENSITIVITY;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, initialScale + zoomDelta));
        setScale(newScale);
        console.log("🔍 줌 중:", { deltaY, newScale: newScale.toFixed(2) });
        
      } else if (isDragging) {
        // 팬 모드: ngraph 스타일 팬
        const deltaX = event.clientX - dragStart.x;
        const deltaY = event.clientY - dragStart.y;
        const newPosition = {
          x: initialPosition.x + deltaX,
          y: initialPosition.y + deltaY
        };
        setPosition(newPosition);
        
        // 드래그 중 커서 변경
        document.body.style.cursor = 'grabbing';
        
        console.log("🖱️ 팬 중:", { deltaX, deltaY, newPosition });
      }
    };

    const handleMouseUp = () => {
      if (isZoomDragging) {
        setIsZoomDragging(false);
        console.log("🔍 줌 드래그 완료:", { finalScale: scale.toFixed(2) });
      }
      if (isDragging) {
        setIsDragging(false);
        console.log("🖱️ 팬 드래그 완료:", { finalPosition: position });
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

  // DOM 기반 휠 이벤트 리스너 추가
  React.useEffect(() => {
    if (selectedTool !== "cursor") return;

    const handleWheel = (event) => {
      event.preventDefault();
      
      console.log("🎡 휠 이벤트:", { deltaY: event.deltaY, selectedTool });
      
      // ngraph 스타일: 마우스 커서 위치에서 줌
      const isZoomIn = event.deltaY < 0;
      const direction = isZoomIn ? 1 : -1;
      const factor = 1 + direction * 0.1; // ngraph와 동일한 팩터
      
      setScale(prevScale => {
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prevScale * factor));
        
        if (newScale !== prevScale) {
          // 정확한 마우스 위치 계산
          const rect = event.target.getBoundingClientRect();
          const mouseX = event.clientX - rect.left;
          const mouseY = event.clientY - rect.top;
          
          // ngraph 스타일: 마우스 위치를 중심으로 줌
          setPosition(prevPosition => {
            // 줌 전 마우스 위치의 월드 좌표
            const worldX = (mouseX - prevPosition.x) / prevScale;
            const worldY = (mouseY - prevPosition.y) / prevScale;
            
            // 줌 후 같은 월드 좌표가 마우스 위치에 오도록 조정
            const newX = mouseX - worldX * newScale;
            const newY = mouseY - worldY * newScale;
            
            return { x: newX, y: newY };
          });
          
          console.log("🔍 휠 줌 적용:", { 
            delta: event.deltaY, 
            prevScale: prevScale.toFixed(2),
            newScale: newScale.toFixed(2),
            mousePos: { x: mouseX, y: mouseY }
          });
        }
        
        return newScale;
      });
    };

    // Canvas 또는 부모 요소에 휠 이벤트 리스너 추가
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      console.log("✅ 휠 이벤트 리스너 추가됨");
      
      return () => {
        canvas.removeEventListener('wheel', handleWheel);
        console.log("🗑️ 휠 이벤트 리스너 제거됨");
      };
    }
  }, [selectedTool]);

  return (
    <>
      {/* 줌 드래그 감지 오버레이 - 배경 전용 */}
      <pixiGraphics
        draw={(graphics) => {
          graphics.clear();
          // 전체 화면을 덮는 투명한 영역
          graphics.setFillStyle({ color: 0xffffff, alpha: 0 });
          graphics.rect(-50000, -50000, 100000, 100000);
          graphics.fill();
        }}
        interactive={selectedTool === "cursor"}
        onPointerDown={handlePointerDown}
        zIndex={-100000} // 최하위 레벨
      />
      
      {/* 줌이 적용된 컨테이너 */}
      <pixiContainer
        ref={containerRef}
        scale={{ x: scale, y: scale }}
        position={position}
      >
        {children}
      </pixiContainer>
      
      {/* 줌/팬 상태 표시 UI */}
      {(isDragging || isZoomDragging || scale !== 1 || position.x !== 0 || position.y !== 0) && (
        <>
          <pixiGraphics
            x={10}
            y={10}
            draw={(graphics) => {
              graphics.clear();
              
              // 배경
              graphics.setFillStyle({ color: 0x000000, alpha: 0.7 });
              graphics.roundRect(0, 0, 200, 60, 8);
              graphics.fill();
              
              // 테두리 (상태에 따른 색상)
              let borderColor = 0x6b7280;
              if (isZoomDragging) borderColor = 0xe74c3c; // 빨강: 줌 중
              else if (isDragging) borderColor = 0x3b82f6; // 파랑: 팬 중
              
              graphics.setStrokeStyle({ color: borderColor, width: 2 });
              graphics.roundRect(0, 0, 200, 60, 8);
              graphics.stroke();
            }}
          />
          <pixiText
            x={20}
            y={25}
            text={`🔍 줌: ${(scale * 100).toFixed(0)}%`}
            style={{
              fontFamily: 'Arial',
              fontSize: 12,
              fill: 0xffffff,
              fontWeight: 'bold'
            }}
            anchor={{ x: 0, y: 0.5 }}
          />
          <pixiText
            x={20}
            y={45}
            text={`🖱️ 팬: (${position.x.toFixed(0)}, ${position.y.toFixed(0)})`}
            style={{
              fontFamily: 'Arial',
              fontSize: 12,
              fill: 0xffffff,
              fontWeight: 'normal'
            }}
            anchor={{ x: 0, y: 0.5 }}
          />
        </>
      )}
      
      {/* 드래그 상태 실시간 표시 */}
      {selectedTool === "cursor" && (isDragging || isZoomDragging) && (
        <pixiText
          x={10}
          y={180}
          text={isDragging ? "🖱️ 팬 드래그 중..." : "🔍 줌 드래그 중..."}
          style={{
            fontFamily: 'Arial',
            fontSize: 14,
            fill: isDragging ? 0x3b82f6 : 0xe74c3c,
            fontWeight: 'bold'
          }}
          alpha={1}
          anchor={{ x: 0, y: 0 }}
        />
      )}
      
      {/* 사용법 안내 (커서 모드에서만 표시) */}
      {selectedTool === "cursor" && !isDragging && !isZoomDragging && scale === 1 && position.x === 0 && position.y === 0 && (
        <>
          <pixiText
            x={10}
            y={60}
            text={`🔍 Shift ${isShiftPressed ? '✅' : '❌'} + 드래그: 줌`}
            style={{
              fontFamily: 'Arial',
              fontSize: 12,
              fill: isShiftPressed ? 0x10b981 : 0x6b7280,
              fontWeight: 'normal'
            }}
            alpha={0.8}
            anchor={{ x: 0, y: 0 }}
          />
          <pixiText
            x={10}
            y={80}
            text="🖱️ 좌클릭 + 드래그: 팬"
            style={{
              fontFamily: 'Arial',
              fontSize: 12,
              fill: 0x6b7280,
              fontWeight: 'normal'
            }}
            alpha={0.8}
            anchor={{ x: 0, y: 0 }}
          />
          <pixiText
            x={10}
            y={100}
            text="🎡 휠: 커서 위치 기준 줌"
            style={{
              fontFamily: 'Arial',
              fontSize: 12,
              fill: 0x6b7280,
              fontWeight: 'normal'
            }}
            alpha={0.8}
            anchor={{ x: 0, y: 0 }}
          />
        </>
      )}
      
      {/* 디버깅용 줌 컨트롤 버튼 */}
      {selectedTool === "cursor" && (
        <>
          <pixiGraphics
            x={10}
            y={140}
            draw={(graphics) => {
              graphics.clear();
              graphics.setFillStyle({ color: 0x10b981, alpha: 0.8 });
              graphics.roundRect(0, 0, 40, 30, 4);
              graphics.fill();
            }}
            interactive={true}
            buttonMode={true}
            onPointerDown={() => {
              console.log("🔍+ 줌 인 버튼 클릭");
              setScale(prev => Math.min(MAX_SCALE, prev * 1.2));
            }}
          />
          <pixiText
            x={20}
            y={155}
            text="🔍+"
            style={{
              fontFamily: 'Arial',
              fontSize: 12,
              fill: 0xffffff,
              fontWeight: 'bold'
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          />
          
          <pixiGraphics
            x={60}
            y={140}
            draw={(graphics) => {
              graphics.clear();
              graphics.setFillStyle({ color: 0xe74c3c, alpha: 0.8 });
              graphics.roundRect(0, 0, 40, 30, 4);
              graphics.fill();
            }}
            interactive={true}
            buttonMode={true}
            onPointerDown={() => {
              console.log("🔍- 줌 아웃 버튼 클릭");
              setScale(prev => Math.max(MIN_SCALE, prev * 0.8));
            }}
          />
          <pixiText
            x={80}
            y={155}
            text="🔍-"
            style={{
              fontFamily: 'Arial',
              fontSize: 12,
              fill: 0xffffff,
              fontWeight: 'bold'
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          />
          
          <pixiGraphics
            x={110}
            y={140}
            draw={(graphics) => {
              graphics.clear();
              graphics.setFillStyle({ color: 0x6b7280, alpha: 0.8 });
              graphics.roundRect(0, 0, 60, 30, 4);
              graphics.fill();
            }}
            interactive={true}
            buttonMode={true}
            onPointerDown={() => {
              console.log("🏠 리셋 버튼 클릭");
              setScale(1);
              setPosition({ x: 0, y: 0 });
            }}
          />
          <pixiText
            x={140}
            y={155}
            text="🏠"
            style={{
              fontFamily: 'Arial',
              fontSize: 12,
              fill: 0xffffff,
              fontWeight: 'bold'
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          />
        </>
      )}
    </>
  );
};

export default ZoomController; 