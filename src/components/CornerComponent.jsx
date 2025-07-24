import React, { useState, useCallback } from 'react';
import { useArchisketch } from '../context/ArchisketchContext';
import { useTool } from '../context/ToolContext';

const CornerComponent = ({ 
  corner, 
  isSnapped, 
  snappedCorner,
  onCornerClick,
  onDragStart,
  isDragging,
  dragTarget
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const { selectedTool, selectedMode } = useTool();

  // 코너 클릭 시 벽 그리기 시작
  const handleCornerClick = useCallback((event) => {
    if (isSnapped) {
      return;
    }

    if (selectedTool !== "wall-drawing" || selectedMode !== "draw") return;
    
    // 부모 컴포넌트에 코너 클릭 이벤트 전달
    if (onCornerClick) {
      onCornerClick(corner);
    }
  }, [selectedTool, selectedMode, isSnapped, corner, onCornerClick]);

  const handlePointerOver = useCallback(() => {
    // 스냅된 상태일 때는 호버 비활성화
    if (isSnapped) {
      return;
    }
    setIsHovered(true);
  }, [isSnapped]);

  const handlePointerOut = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handlePointerDown = useCallback((event) => {
    // 커서 모드일 때만 드래그 가능
    if (selectedTool !== "cursor") {
      return;
    }
    
    // 부모 컴포넌트에 드래그 시작 이벤트 전달
    if (onDragStart) {
      onDragStart(corner);
    }
  }, [selectedTool, corner, onDragStart]);

  const handlePointerUp = useCallback((event) => {
    // 드래그 종료는 PixiCanvas에서 처리
  }, []);

  const handlePointerMove = useCallback((event) => {
    // 드래그 이동은 PixiCanvas에서 처리
  }, []);

  return (
    <pixiGraphics
      x={corner.position.x}
      y={corner.position.z}
      draw={(graphics) => {
        graphics.clear();
        
        // 호버 영역을 위한 큰 투명 원 (호버 감지용)
        graphics.setFillStyle({ color: 0xffffff, alpha: 0 });
        graphics.circle(0, 0, 30); // 30px 반지름으로 호버 영역 확장
        graphics.fill();
        
        // 호버 상태에 따른 색상 변경
        const fillColor = isHovered ? 0xf59e0b : 0xfbbf24; // 호버 시 더 진한 노란색
        const strokeColor = isHovered ? 0x92400e : 0x92400e;
        const strokeWidth = isHovered ? 3 : 2;
        const radius = isHovered ? 13 : 12; // 기본 크기도 약간 키움
        
        // 드래그 중인 코너는 반투명하게 표시
        const alpha = (dragTarget?.archiId === corner.archiId) ? 0.7 : 1;
        
        graphics.setFillStyle({ color: fillColor, alpha });
        graphics.circle(0, 0, radius);
        graphics.fill();
        
        // 테두리
        graphics.setStrokeStyle({ color: strokeColor, width: strokeWidth, alpha });
        graphics.circle(0, 0, radius);
        graphics.stroke();
      }}
      interactive={!isSnapped && selectedTool === "cursor"}
      buttonMode={true}
      cursor={selectedTool === "cursor" ? "grab" : "crosshair"}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handlePointerDown}
      onClick={handleCornerClick}
    />
  );
};

export default CornerComponent; 