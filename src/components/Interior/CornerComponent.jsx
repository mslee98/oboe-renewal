import React, { useState, useCallback } from 'react';
import { useTool } from '../../context/ToolContext';
import { logicalToPixel } from '../../utils/coordinateUtils';
import { Rectangle } from 'pixi.js';

/**
 * 코너 컴포넌트 - 최소 기능만
 * 
 * 기능:
 * 1. 코너 시각화 (원형)
 * 2. 클릭 시 부모에게 전달
 * 3. 호버 시각 피드백
 */
const CornerComponent = ({ 
  corner, 
  onCornerClick 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { selectedTool, selectedMode } = useTool();

  // 논리적 단위 → 픽셀 변환
  const pixelPos = logicalToPixel({ x: corner.position.x, z: corner.position.z });

  /**
   * 코너 클릭 핸들러
   * - 벽 그리기 모드에서만 동작
   * - 클릭 시 부모 컴포넌트에 코너 정보 전달
   */
  const handleClick = useCallback((event) => {
    event.stopPropagation(); // 이벤트 전파 중단
    
    // 벽 그리기 모드가 아니면 무시
    if (selectedTool !== "wall-drawing" || selectedMode !== "draw") {
      return;
    }

    // 부모 컴포넌트에 코너 클릭 이벤트 전달
    if (onCornerClick) {
      onCornerClick(corner);
    }
  }, [selectedTool, selectedMode, corner, onCornerClick]);

  return (
    <pixiGraphics
      x={pixelPos.x}
      y={pixelPos.z}
      draw={(graphics) => {
        graphics.clear();
        
        // 호버 영역 확장 (클릭 감지용) - hitArea와 동일하게
        graphics.setFillStyle({ color: 0xffffff, alpha: 0 });
        graphics.circle(0, 0, 30);
        graphics.fill();
        
        // 호버 상태에 따른 색상
        const fillColor = isHovered ? 0xf59e0b : 0xfbbf24;
        const strokeColor = 0x92400e;
        const radius = isHovered ? 13 : 12;
        const strokeWidth = isHovered ? 3 : 2;
        
        // 코너 원 그리기
        graphics.setFillStyle({ color: fillColor, alpha: 1 });
        graphics.circle(0, 0, radius);
        graphics.fill();
        
        graphics.setStrokeStyle({ color: strokeColor, width: strokeWidth, alpha: 1 });
        graphics.circle(0, 0, radius);
        graphics.stroke();
        
        // 디버깅: 호버 상태 표시
        if (isHovered) {
          graphics.setStrokeStyle({ color: 0xff0000, width: 2, alpha: 0.5 });
          graphics.circle(0, 0, 35);
          graphics.stroke();
        }
      }}
      interactive={true}
      buttonMode={true}
      cursor="crosshair"
      eventMode="static"
      onPointerOver={(event) => {
        console.log("🎯 코너 호버 시작!", corner.archiId);
        event.stopPropagation();
        setIsHovered(true);
      }}
      onPointerOut={(event) => {
        console.log("👋 코너 호버 종료", corner.archiId);
        event.stopPropagation();
        setIsHovered(false);
      }}
      onClick={handleClick}
      zIndex={10000} // 가장 높은 레벨
      hitArea={new Rectangle(-30, -30, 60, 60)}
    />
  );
};

export default CornerComponent;
