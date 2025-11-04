import React, { useState, useRef } from 'react';
import { useArchisketch } from '../../context/ArchisketchContext';

const WallDragOverlay = ({ wall, corners }) => {
  const { updateCornerPosition } = useArchisketch();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const dragRef = useRef(null);

  // 벽의 두 코너 정보 가져오기
  const corner1 = corners.find(c => c.archiId === wall.corners[0]);
  const corner2 = corners.find(c => c.archiId === wall.corners[1]);

  if (!corner1 || !corner2) return null;

  // 벽의 중점 계산
  const wallCenter = {
    x: (corner1.position.x + corner2.position.x) / 2,
    z: (corner1.position.z + corner2.position.z) / 2
  };

  // 벽의 길이와 각도 계산
  const wallVector = {
    x: corner2.position.x - corner1.position.x,
    z: corner2.position.z - corner1.position.z
  };
  const wallLength = Math.sqrt(wallVector.x ** 2 + wallVector.z ** 2);

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      corner1Pos: { ...corner1.position },
      corner2Pos: { ...corner2.position }
    });

    console.log(`🔧 벽 드래그 시작: ${wall.corners.join('-')}`);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !dragStart) return;

    const deltaX = (e.clientX - dragStart.x) * 10; // 스케일 조정
    const deltaZ = (e.clientY - dragStart.y) * 10;

    // 두 코너를 함께 이동
    const newCorner1Pos = {
      x: dragStart.corner1Pos.x + deltaX,
      y: dragStart.corner1Pos.y,
      z: dragStart.corner1Pos.z + deltaZ
    };

    const newCorner2Pos = {
      x: dragStart.corner2Pos.x + deltaX,
      y: dragStart.corner2Pos.y,
      z: dragStart.corner2Pos.z + deltaZ
    };

    // 코너 위치 업데이트
    updateCornerPosition(corner1.archiId, newCorner1Pos);
    updateCornerPosition(corner2.archiId, newCorner2Pos);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      console.log(`✅ 벽 드래그 완료: ${wall.corners.join('-')}`);
      setIsDragging(false);
      setDragStart(null);
    }
  };

  // 전역 마우스 이벤트 리스너
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  return (
    <mesh
      ref={dragRef}
      position={[wallCenter.x, 50, wallCenter.z]}
      onPointerDown={handleMouseDown}
      onPointerEnter={() => document.body.style.cursor = 'move'}
      onPointerLeave={() => document.body.style.cursor = 'default'}
    >
      {/* 벽 드래그 핸들 (보이지 않는 박스) */}
      <boxGeometry args={[wallLength, 20, 20]} />
      <meshBasicMaterial 
        color={isDragging ? '#ff6b6b' : '#4ecdc4'} 
        transparent 
        opacity={isDragging ? 0.6 : 0.3}
      />
      
      {/* 드래그 가능 표시 (작은 핸들) */}
      <mesh position={[0, 10, 0]}>
        <sphereGeometry args={[8]} />
        <meshBasicMaterial 
          color={isDragging ? '#ff4757' : '#2ed573'} 
          transparent 
          opacity={0.8}
        />
      </mesh>
    </mesh>
  );
};

export default WallDragOverlay; 