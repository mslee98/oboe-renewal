import React, { useState, useCallback, useEffect } from 'react';
import { useArchisketch } from '../../context/ArchisketchContext';
import { useTool } from '../../context/ToolContext';

const VirtualCornerOverlay = ({ 
  corner, 
  isSnapped
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreviewWalls, setDragPreviewWalls] = useState([]);
  const [virtualPosition, setVirtualPosition] = useState({ 
    x: corner.position.x, 
    z: corner.position.z 
  }); // 가상 코너 위치
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); // 드래그 시작점 오프셋
  
  const { updateCorner, walls, corners } = useArchisketch();
  const { selectedTool } = useTool();

  // 원본 코너 위치가 변경되면 가상 위치도 동기화 (드래그 중이 아닐 때만)
  useEffect(() => {
    if (!isDragging) {
      setVirtualPosition({ x: corner.position.x, z: corner.position.z });
    }
  }, [corner.position.x, corner.position.z, isDragging]);

  // 연결된 벽들의 미리보기 계산
  const getConnectedWallsPreview = useCallback((cornerId, newPosition) => {
    const connectedWalls = walls.filter(wall => 
      wall.corners.includes(cornerId)
    );
    
    return connectedWalls.map(wall => {
      const otherCornerId = wall.corners.find(id => id !== cornerId);
      const otherCorner = corners.find(c => c.archiId === otherCornerId);
      
      if (!otherCorner) return null;
      
      return {
        ...wall,
        previewStart: wall.corners[0] === cornerId ? { x: newPosition.x, z: newPosition.y } : otherCorner.position,
        previewEnd: wall.corners[1] === cornerId ? { x: newPosition.x, z: newPosition.y } : otherCorner.position
      };
    }).filter(Boolean);
  }, [walls, corners]);

  const handlePointerOver = useCallback(() => {
    if (isSnapped) return;
    setIsHovered(true);
  }, [isSnapped]);

  const handlePointerOut = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handlePointerDown = useCallback((event) => {
    if (isSnapped) return;
    
    setIsDragging(true);
    
    // PIXI의 글로벌 이벤트 시스템 사용 (더 안정적)
    const stage = event.currentTarget.parent;
    let currentPosition = { x: virtualPosition.x, z: virtualPosition.z }; // 최신 위치 추적
    
    const onGlobalMove = (moveEvent) => {
      const newPosition = moveEvent.data.getLocalPosition(stage);
      currentPosition = { x: newPosition.x, z: newPosition.y }; // 실시간 위치 업데이트
      setVirtualPosition(currentPosition);
      
      // 미리보기 계산
      const previewWalls = getConnectedWallsPreview(corner.archiId, newPosition);
      setDragPreviewWalls(previewWalls);
    };
    
    const onGlobalUp = () => {
      stage.off('pointermove', onGlobalMove);
      stage.off('pointerup', onGlobalUp);
      stage.off('pointerupoutside', onGlobalUp);
      
      // 실제 코너 위치 업데이트 (최신 위치 사용)
      updateCorner(corner.archiId, {
        position: {
          x: currentPosition.x,
          y: corner.position.y,
          z: currentPosition.z
        }
      });
      
      setIsDragging(false);
      setDragPreviewWalls([]);
      
      console.log("가상 노드 드롭 완료:", corner.archiId, currentPosition);
    };
    
    // Stage 레벨에서 이벤트 리스닝 (화면 전체에서 추적)
    stage.on('pointermove', onGlobalMove);
    stage.on('pointerup', onGlobalUp);
    stage.on('pointerupoutside', onGlobalUp);
    
    console.log("가상 노드 드래그 시작:", corner.archiId);
  }, [isSnapped, corner.archiId, virtualPosition, getConnectedWallsPreview, updateCorner, corner.position.y]);

  // 글로벌 드래그 방식이므로 이 핸들러들은 더이상 사용하지 않음
  const handlePointerUp = useCallback(() => {
    // 글로벌 이벤트가 처리
  }, []);

  const handlePointerMove = useCallback(() => {
    // 글로벌 이벤트가 처리  
  }, []);

  // 커서 모드일 때만 표시
  if (selectedTool !== "cursor") {
    return null;
  }

  return (
    <>
      {/* 가상 노드 오버레이 */}
      <pixiGraphics
        x={virtualPosition.x}
        y={virtualPosition.z}
        draw={(graphics) => {
          graphics.clear();
          
          // 호버 영역을 위한 큰 투명 원 (호버 감지용)
          graphics.setFillStyle({ color: 0xffffff, alpha: 0 });
          graphics.circle(0, 0, 30);
          graphics.fill();
          
          // 가상 노드 스타일 (기존 코너보다 약간 큰 반투명 원)
          if (isHovered || isDragging) {
            const fillColor = isDragging ? 0x3b82f6 : 0x10b981; // 드래그 중: 파란색, 호버: 초록색
            const alpha = isDragging ? 0.8 : 0.6;
            const radius = 16;
            
            graphics.setFillStyle({ color: fillColor, alpha });
            graphics.circle(0, 0, radius);
            graphics.fill();
            
            // 테두리
            graphics.setStrokeStyle({ color: fillColor, width: 2, alpha: 1 });
            graphics.circle(0, 0, radius);
            graphics.stroke();
          }
        }}
        interactive={!isSnapped}
        buttonMode={true}
        cursor={isDragging ? "grabbing" : "grab"}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerUpOutside={handlePointerUp}
        onPointerMove={handlePointerMove}
      />
      
      {/* 드래그 미리보기 벽들 */}
      {isDragging && dragPreviewWalls.map(wall => (
        <pixiGraphics
          key={`virtual-preview-${wall.archiId}`}
          draw={(graphics) => {
            graphics.clear();
            graphics.setStrokeStyle({ 
              color: 0x3b82f6, // 파란색
              width: 15,
              alpha: 0.6
            });
            
            graphics.moveTo(wall.previewStart.x, wall.previewStart.z);
            graphics.lineTo(wall.previewEnd.x, wall.previewEnd.z);
            graphics.stroke();
          }}
        />
      ))}
    </>
  );
};

export default VirtualCornerOverlay; 