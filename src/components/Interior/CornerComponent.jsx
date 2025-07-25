import React, { useState, useCallback } from 'react';
import { useArchisketch } from '../../context/ArchisketchContext';
import { useTool } from '../../context/ToolContext';

const CornerComponent = ({ 
  corner, 
  isSnapped, 
  snappedCorner, 
  onCornerClick 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { selectedTool, selectedMode } = useTool();
  const { deleteCorner } = useArchisketch();

  // 코너 클릭 시 벽 그리기 또는 삭제 (원래 커밋 기능 그대로)
  const handleCornerClick = useCallback((event) => {
    if (isSnapped) {
      return;
    }

    // 커서 모드에서 더블클릭 시 코너 삭제
    if (selectedTool === "cursor") {
      if (event.detail === 2) { // 더블클릭
        console.log("코너 더블클릭 - 삭제:", corner.archiId);
        deleteCorner(corner.archiId);
        return;
      }
      // 단일 클릭은 무시 (드래그 용도)
      return;
    }

    if (selectedTool !== "wall-drawing" || selectedMode !== "draw") return;

    // 부모 컴포넌트에 코너 클릭 이벤트 전달
    if (onCornerClick) {
      onCornerClick(corner);
    }
  }, [selectedTool, selectedMode, isSnapped, corner, onCornerClick, deleteCorner]);

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
    // 커서 모드일 때는 드래그 이벤트 무시 (VirtualCornerOverlay가 처리)
    if (selectedTool === "cursor") {
      return;
    }
  }, [selectedTool]);

  const handlePointerUp = useCallback((event) => {
    // VirtualCornerOverlay가 처리
  }, []);

  const handlePointerMove = useCallback((event) => {
    // VirtualCornerOverlay가 처리
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
        
        // 호버 상태에 따른 색상 변경 (원래 커밋 로직)
        let fillColor = isHovered ? 0xf59e0b : 0xfbbf24; // 기본: 호버 시 더 진한 노란색
        let strokeColor = isHovered ? 0x92400e : 0x92400e;
        
        // 커서 모드에서 호버 시 삭제 가능 표시 (빨간색) - 원래 커밋 그대로
        if (selectedTool === "cursor" && isHovered) {
          fillColor = 0xef4444; // 빨간색
          strokeColor = 0xdc2626; // 더 진한 빨간색
        }
        
        const strokeWidth = isHovered ? 3 : 2;
        const radius = isHovered ? 13 : 12; // 기본 크기도 약간 키움
        
        // 기본 알파값
        const alpha = 1;
        
        graphics.setFillStyle({ color: fillColor, alpha });
        graphics.circle(0, 0, radius);
        graphics.fill();
        
        // 테두리
        graphics.setStrokeStyle({ color: strokeColor, width: strokeWidth, alpha });
        graphics.circle(0, 0, radius);
        graphics.stroke();
      }}
      interactive={!isSnapped} // 원래 커밋 그대로
      buttonMode={true}
      cursor={selectedTool === "cursor" ? "grab" : "crosshair"}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handlePointerDown}
      onClick={handleCornerClick}
      zIndex={1001} // 기본 코너는 낮은 우선순위
    />
  );
};

export default CornerComponent; 