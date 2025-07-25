import React, { useState, useCallback, useEffect } from 'react';
import { useArchisketch } from '../../context/ArchisketchContext';
import { useTool } from '../../context/ToolContext';

const Wall2DDragOverlay = ({ wall, corners }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreviewWalls, setDragPreviewWalls] = useState([]);
  const [virtualWallPosition, setVirtualWallPosition] = useState(null); // 벽의 가상 위치
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); // 드래그 시작점 오프셋
  const [constraintAxis, setConstraintAxis] = useState(null); // 현재 축 제약 상태
  
  const { updateCornerPosition, walls } = useArchisketch();
  const { selectedTool } = useTool();

  // 벽의 두 코너 정보 가져오기
  const corner1 = corners.find(c => c.archiId === wall.corners[0]);
  const corner2 = corners.find(c => c.archiId === wall.corners[1]);

  if (!corner1 || !corner2) return null;

  // 벽의 중점과 속성 계산
  const wallCenter = {
    x: (corner1.position.x + corner2.position.x) / 2,
    z: (corner1.position.z + corner2.position.z) / 2
  };

  const wallLength = Math.sqrt(
    Math.pow(corner2.position.x - corner1.position.x, 2) + 
    Math.pow(corner2.position.z - corner1.position.z, 2)
  );

  const wallAngle = Math.atan2(
    corner2.position.z - corner1.position.z,
    corner2.position.x - corner1.position.x
  );

  // 벽과 연결된 다른 벽들의 미리보기 계산
  const getConnectedWallsPreview = useCallback((newWallCenter) => {
    const deltaX = newWallCenter.x - wallCenter.x;
    const deltaZ = newWallCenter.z - wallCenter.z;

    // 이동된 코너들의 새 위치
    const newCorner1Pos = {
      x: corner1.position.x + deltaX,
      z: corner1.position.z + deltaZ
    };
    const newCorner2Pos = {
      x: corner2.position.x + deltaX,
      z: corner2.position.z + deltaZ
    };

    // 이 벽과 연결된 다른 벽들 찾기
    const connectedWalls = walls.filter(w => 
      w.archiId !== wall.archiId && (
        w.corners.includes(wall.corners[0]) || 
        w.corners.includes(wall.corners[1])
      )
    );

    return connectedWalls.map(connectedWall => {
      const otherCorner1 = corners.find(c => c.archiId === connectedWall.corners[0]);
      const otherCorner2 = corners.find(c => c.archiId === connectedWall.corners[1]);

      let previewStart, previewEnd;

      // 연결된 벽의 시작점과 끝점 결정
      if (connectedWall.corners[0] === wall.corners[0]) {
        // 첫 번째 코너가 공유됨
        previewStart = newCorner1Pos;
        previewEnd = { x: otherCorner2.position.x, z: otherCorner2.position.z };
      } else if (connectedWall.corners[0] === wall.corners[1]) {
        // 두 번째 코너가 공유됨
        previewStart = newCorner2Pos;
        previewEnd = { x: otherCorner2.position.x, z: otherCorner2.position.z };
      } else if (connectedWall.corners[1] === wall.corners[0]) {
        // 첫 번째 코너가 공유됨
        previewStart = { x: otherCorner1.position.x, z: otherCorner1.position.z };
        previewEnd = newCorner1Pos;
      } else if (connectedWall.corners[1] === wall.corners[1]) {
        // 두 번째 코너가 공유됨
        previewStart = { x: otherCorner1.position.x, z: otherCorner1.position.z };
        previewEnd = newCorner2Pos;
      }

      return {
        archiId: connectedWall.archiId,
        previewStart,
        previewEnd
      };
    });
  }, [wall.archiId, wall.corners, walls, corners, corner1.position, corner2.position, wallCenter]);

  // 각도 유지 미리보기 계산 (벽 수직 이동용)
  const getAngularPreview = useCallback((newWallCenter) => {
    const wallVector = {
      x: corner2.position.x - corner1.position.x,
      z: corner2.position.z - corner1.position.z
    };
    const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.z * wallVector.z);
    const perpUnit = {
      x: -wallVector.z / wallLength,
      z: wallVector.x / wallLength
    };
    
    const totalMovement = {
      x: newWallCenter.x - wallCenter.x,
      z: newWallCenter.z - wallCenter.z
    };
    
    const wallMovement = totalMovement.x * perpUnit.x + totalMovement.z * perpUnit.z;

    // 연결된 벽들의 미리보기
    const connectedWalls = walls.filter(w => 
      w.archiId !== wall.archiId && (
        w.corners.includes(wall.corners[0]) || 
        w.corners.includes(wall.corners[1])
      )
    );

    return connectedWalls.map(connectedWall => {
      const otherCorner1 = corners.find(c => c.archiId === connectedWall.corners[0]);
      const otherCorner2 = corners.find(c => c.archiId === connectedWall.corners[1]);

      let previewStart, previewEnd;

             if (connectedWall.corners[0] === wall.corners[0]) {
         // corner1(A)이 공유됨 - A를 각도 유지하며 이동
         const otherCorner = otherCorner2;
         const wallVec = {
           x: corner1.position.x - otherCorner.position.x,
           z: corner1.position.z - otherCorner.position.z
         };
         const wallLen = Math.sqrt(wallVec.x * wallVec.x + wallVec.z * wallVec.z);
         const wallUnit = {
           x: wallVec.x / wallLen,
           z: wallVec.z / wallLen
         };

         previewStart = {
           x: otherCorner.position.x + wallUnit.x * (wallLen - wallMovement),
           z: otherCorner.position.z + wallUnit.z * (wallLen - wallMovement)
         };
         previewEnd = { x: otherCorner.position.x, z: otherCorner.position.z };
             } else if (connectedWall.corners[0] === wall.corners[1]) {
         // corner2(B)가 공유됨 - B를 각도 유지하며 이동
         const otherCorner = otherCorner2;
         const wallVec = {
           x: corner2.position.x - otherCorner.position.x,
           z: corner2.position.z - otherCorner.position.z
         };
         const wallLen = Math.sqrt(wallVec.x * wallVec.x + wallVec.z * wallVec.z);
         const wallUnit = {
           x: wallVec.x / wallLen,
           z: wallVec.z / wallLen
         };

         previewStart = {
           x: otherCorner.position.x + wallUnit.x * (wallLen - wallMovement),
           z: otherCorner.position.z + wallUnit.z * (wallLen - wallMovement)
         };
         previewEnd = { x: otherCorner.position.x, z: otherCorner.position.z };
             } else if (connectedWall.corners[1] === wall.corners[0]) {
         // corner1(A)이 공유됨
         const otherCorner = otherCorner1;
         const wallVec = {
           x: corner1.position.x - otherCorner.position.x,
           z: corner1.position.z - otherCorner.position.z
         };
         const wallLen = Math.sqrt(wallVec.x * wallVec.x + wallVec.z * wallVec.z);
         const wallUnit = {
           x: wallVec.x / wallLen,
           z: wallVec.z / wallLen
         };

         previewStart = { x: otherCorner.position.x, z: otherCorner.position.z };
         previewEnd = {
           x: otherCorner.position.x + wallUnit.x * (wallLen - wallMovement),
           z: otherCorner.position.z + wallUnit.z * (wallLen - wallMovement)
         };
             } else if (connectedWall.corners[1] === wall.corners[1]) {
         // corner2(B)가 공유됨
         const otherCorner = otherCorner1;
         const wallVec = {
           x: corner2.position.x - otherCorner.position.x,
           z: corner2.position.z - otherCorner.position.z
         };
         const wallLen = Math.sqrt(wallVec.x * wallVec.x + wallVec.z * wallVec.z);
         const wallUnit = {
           x: wallVec.x / wallLen,
           z: wallVec.z / wallLen
         };

         previewStart = { x: otherCorner.position.x, z: otherCorner.position.z };
         previewEnd = {
           x: otherCorner.position.x + wallUnit.x * (wallLen - wallMovement),
           z: otherCorner.position.z + wallUnit.z * (wallLen - wallMovement)
         };
      }

      return {
        archiId: connectedWall.archiId,
        previewStart,
        previewEnd
      };
    });
  }, [wall.archiId, wall.corners, walls, corners, corner1.position, corner2.position, wallCenter]);

  // 호버 이벤트 핸들러
  const handlePointerOver = useCallback(() => {
    if (!isDragging) {
      setIsHovered(true);
    }
  }, [isDragging]);

  const handlePointerOut = useCallback(() => {
    setIsHovered(false);
  }, []);

  // 드래그 시작 핸들러 (축 제약 포함)
  const handlePointerDown = useCallback((e) => {
    const stage = e.currentTarget.parent;
    if (!stage) {
      console.error("Stage 참조가 없습니다.");
      return;
    }

    e.stopPropagation();
    setIsDragging(true);
    setIsHovered(false);

    const localPoint = e.data.getLocalPosition(stage);
    
    // 드래그 시작점과 벽 중점 사이의 오프셋 계산
    const offset = {
      x: localPoint.x - wallCenter.x,
      y: localPoint.y - wallCenter.z
    };
    setDragOffset(offset);

    // 초기 가상 위치 설정
    setVirtualWallPosition({ x: wallCenter.x, z: wallCenter.z });

    // 축 제약을 위한 초기 설정
    const startMousePos = { x: localPoint.x, y: localPoint.y };
    let constraintAxis = null; // 'horizontal', 'vertical', null
    const CONSTRAINT_THRESHOLD = 20; // 축 제약 활성화 임계값

    // 글로벌 이벤트 핸들러 정의
    let currentPosition = { x: wallCenter.x, z: wallCenter.z };

    const onGlobalMove = (globalE) => {
      const newLocalPoint = globalE.data.getLocalPosition(stage);
      
      // 마우스 이동 거리 계산
      const mouseDeltaX = newLocalPoint.x - startMousePos.x;
      const mouseDeltaZ = newLocalPoint.y - startMousePos.y;
      const totalMouseMovement = Math.sqrt(mouseDeltaX * mouseDeltaX + mouseDeltaZ * mouseDeltaZ);

      // 축 제약 결정 (벽 기준 좌표계로)
      if (!constraintAxis && totalMouseMovement > CONSTRAINT_THRESHOLD) {
        // 벽의 방향 벡터 계산
        const wallVector = {
          x: corner2.position.x - corner1.position.x,
          z: corner2.position.z - corner1.position.z
        };
        const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.z * wallVector.z);
        
        // 벽의 단위 벡터
        const wallUnit = {
          x: wallVector.x / wallLength,
          z: wallVector.z / wallLength
        };
        
        // 벽에 수직인 단위 벡터
        const perpUnit = {
          x: -wallUnit.z,
          z: wallUnit.x
        };

        // 마우스 이동을 벽 기준으로 분해
        const parallelMovement = Math.abs(mouseDeltaX * wallUnit.x + mouseDeltaZ * wallUnit.z);
        const perpendicularMovement = Math.abs(mouseDeltaX * perpUnit.x + mouseDeltaZ * perpUnit.z);
        
        if (parallelMovement > perpendicularMovement * 1.5) {
          constraintAxis = 'horizontal'; // 벽에 평행한 이동
          setConstraintAxis('horizontal');
          console.log('🔒 벽 평행 축 제약 활성화');
        } else if (perpendicularMovement > parallelMovement * 1.5) {
          constraintAxis = 'vertical'; // 벽에 수직한 이동
          setConstraintAxis('vertical');
          console.log('🔒 벽 수직 축 제약 활성화');
        }
      }

             // 벽 기준 지역 좌표계 계산
       const wallVector = {
         x: corner2.position.x - corner1.position.x,
         z: corner2.position.z - corner1.position.z
       };
       const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.z * wallVector.z);
       
       // 벽의 단위 벡터 (평행 방향)
       const wallUnit = {
         x: wallVector.x / wallLength,
         z: wallVector.z / wallLength
       };
       
       // 벽에 수직인 단위 벡터 (수직 방향)
       const perpUnit = {
         x: -wallUnit.z, // 90도 회전
         z: wallUnit.x
       };

       // 마우스 이동을 벽 기준 좌표계로 변환
       const mouseMovement = {
         x: newLocalPoint.x - offset.x - wallCenter.x,
         z: newLocalPoint.y - offset.y - wallCenter.z
       };

       // 벽 평행/수직 성분으로 분해
       const parallelComponent = mouseMovement.x * wallUnit.x + mouseMovement.z * wallUnit.z;
       const perpendicularComponent = mouseMovement.x * perpUnit.x + mouseMovement.z * perpUnit.z;

       // 축 제약 적용
       let constrainedPosition;
       if (constraintAxis === 'horizontal') {
         // 벽에 평행한 방향으로만 이동
         constrainedPosition = {
           x: wallCenter.x + parallelComponent * wallUnit.x,
           z: wallCenter.z + parallelComponent * wallUnit.z
         };
       } else if (constraintAxis === 'vertical') {
         // 벽에 수직한 방향으로만 이동  
         constrainedPosition = {
           x: wallCenter.x + perpendicularComponent * perpUnit.x,
           z: wallCenter.z + perpendicularComponent * perpUnit.z
         };
       } else {
         // 자유 이동 (제약 없음)
         constrainedPosition = {
           x: newLocalPoint.x - offset.x,
           z: newLocalPoint.y - offset.y
         };
       }

      currentPosition = constrainedPosition;
      setVirtualWallPosition(currentPosition);

      // 미리보기 계산 (제약에 따라 다르게 처리)
      let previewWalls;
      if (constraintAxis === 'vertical') {
        // 벽 수직 이동 시: 각도 유지 미리보기
        previewWalls = getAngularPreview(currentPosition);
      } else {
        // 기존 방식: 벽 전체 이동 미리보기
        previewWalls = getConnectedWallsPreview(currentPosition);
      }
      setDragPreviewWalls(previewWalls);
    };

    const onGlobalUp = () => {
      stage.off('pointermove', onGlobalMove);
      stage.off('pointerup', onGlobalUp);
      stage.off('pointerupoutside', onGlobalUp);

      console.log(`🎯 벽 드래그 완료: ${wall.corners.join('-')}`);

             // 제약에 따른 코너 위치 업데이트
               if (constraintAxis === 'vertical') {
          // 벽 수직 이동: 각 코너를 연결된 벽의 방향으로 이동 (각도 유지)
          
          // 벽에 수직인 방향의 실제 이동 거리 계산
          const wallVector = {
            x: corner2.position.x - corner1.position.x,
            z: corner2.position.z - corner1.position.z
          };
          const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.z * wallVector.z);
          const perpUnit = {
            x: -wallVector.z / wallLength,
            z: wallVector.x / wallLength
          };
          
          const totalMovement = {
            x: currentPosition.x - wallCenter.x,
            z: currentPosition.z - wallCenter.z
          };
          
          // 벽에 수직인 성분만 추출
          const wallMovement = totalMovement.x * perpUnit.x + totalMovement.z * perpUnit.z;
         
         // corner1(A)을 연결된 다른 벽 방향으로 이동
         const corner1ConnectedWalls = walls.filter(w => 
           w.archiId !== wall.archiId && w.corners.includes(corner1.archiId)
         );
         
         // corner2(B)를 연결된 다른 벽 방향으로 이동  
         const corner2ConnectedWalls = walls.filter(w => 
           w.archiId !== wall.archiId && w.corners.includes(corner2.archiId)
         );

                   if (corner1ConnectedWalls.length > 0 && corner2ConnectedWalls.length > 0) {
            // 드래그 벽의 이동 방향 벡터 계산
            const dragVector = {
              x: currentPosition.x - wallCenter.x,
              z: currentPosition.z - wallCenter.z
            };
            
            // A의 연결된 벽 방향으로 A 이동
            const wall1 = corner1ConnectedWalls[0];
            const otherCorner1Id = wall1.corners.find(id => id !== corner1.archiId);
            const otherCorner1 = corners.find(c => c.archiId === otherCorner1Id);
            
            if (otherCorner1) {
              const wall1Vector = {
                x: corner1.position.x - otherCorner1.position.x,
                z: corner1.position.z - otherCorner1.position.z
              };
              const wall1Length = Math.sqrt(wall1Vector.x * wall1Vector.x + wall1Vector.z * wall1Vector.z);
              const wall1Unit = {
                x: wall1Vector.x / wall1Length,
                z: wall1Vector.z / wall1Length
              };

              // 연결된 벽의 방향과 드래그 방향의 일치성 확인
              const dotProduct1 = dragVector.x * wall1Unit.x + dragVector.z * wall1Unit.z;
              const movement1 = dotProduct1 > 0 ? Math.abs(wallMovement) : -Math.abs(wallMovement);

              const newCorner1Pos = {
                x: otherCorner1.position.x + wall1Unit.x * (wall1Length + movement1),
                y: corner1.position.y,
                z: otherCorner1.position.z + wall1Unit.z * (wall1Length + movement1)
              };
              updateCornerPosition(corner1.archiId, newCorner1Pos);
            }

            // B의 연결된 벽 방향으로 B 이동
            const wall2 = corner2ConnectedWalls[0];
            const otherCorner2Id = wall2.corners.find(id => id !== corner2.archiId);
            const otherCorner2 = corners.find(c => c.archiId === otherCorner2Id);
            
            if (otherCorner2) {
              const wall2Vector = {
                x: corner2.position.x - otherCorner2.position.x,
                z: corner2.position.z - otherCorner2.position.z
              };
              const wall2Length = Math.sqrt(wall2Vector.x * wall2Vector.x + wall2Vector.z * wall2Vector.z);
              const wall2Unit = {
                x: wall2Vector.x / wall2Length,
                z: wall2Vector.z / wall2Length
              };

              // 연결된 벽의 방향과 드래그 방향의 일치성 확인
              const dotProduct2 = dragVector.x * wall2Unit.x + dragVector.z * wall2Unit.z;
              const movement2 = dotProduct2 > 0 ? Math.abs(wallMovement) : -Math.abs(wallMovement);

              const newCorner2Pos = {
                x: otherCorner2.position.x + wall2Unit.x * (wall2Length + movement2),
                y: corner2.position.y,
                z: otherCorner2.position.z + wall2Unit.z * (wall2Length + movement2)
              };
              updateCornerPosition(corner2.archiId, newCorner2Pos);
            }
          }
       } else {
         // 기존 방식: 벽 전체 이동 (평행 이동 또는 자유 이동)
         const deltaX = currentPosition.x - wallCenter.x;
         const deltaZ = currentPosition.z - wallCenter.z;

         const newCorner1Pos = {
           x: corner1.position.x + deltaX,
           y: corner1.position.y,
           z: corner1.position.z + deltaZ
         };

         const newCorner2Pos = {
           x: corner2.position.x + deltaX,
           y: corner2.position.y,
           z: corner2.position.z + deltaZ
         };

         updateCornerPosition(corner1.archiId, newCorner1Pos);
         updateCornerPosition(corner2.archiId, newCorner2Pos);
       }

      // 상태 초기화
      setIsDragging(false);
      setDragPreviewWalls([]);
      setVirtualWallPosition(null);
      setConstraintAxis(null);

      console.log(`벽 드래그 완료: ${wall.corners.join('-')}`);
    };

    // Stage 레벨에서 이벤트 리스닝
    stage.on('pointermove', onGlobalMove);
    stage.on('pointerup', onGlobalUp);
    stage.on('pointerupoutside', onGlobalUp);

    console.log(`🔧 벽 드래그 시작: ${wall.corners.join('-')}`);
  }, [wallCenter, wall.corners, corner1, corner2, getConnectedWallsPreview, updateCornerPosition]);

  // 더미 핸들러들 (실제로는 글로벌 이벤트가 처리)
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

  // 현재 벽 위치 (드래그 중이면 가상 위치, 아니면 실제 위치)
  const currentWallCenter = virtualWallPosition || wallCenter;
  const currentCorner1 = virtualWallPosition ? {
    x: corner1.position.x + (virtualWallPosition.x - wallCenter.x),
    z: corner1.position.z + (virtualWallPosition.z - wallCenter.z)
  } : { x: corner1.position.x, z: corner1.position.z };
  
  const currentCorner2 = virtualWallPosition ? {
    x: corner2.position.x + (virtualWallPosition.x - wallCenter.x),
    z: corner2.position.z + (virtualWallPosition.z - wallCenter.z)
  } : { x: corner2.position.x, z: corner2.position.z };

  return (
    <>
      {/* 벽 드래그 오버레이 */}
      <pixiGraphics
        draw={(graphics) => {
          graphics.clear();
          
                     // 드래그 핸들 영역 (넓은 클릭 영역)
           if (isHovered && !isDragging) {
             const strokeColor = 0x10b981; // 호버 시에만 초록색
             const strokeWidth = 25;
             const alpha = 0.4;
            
            graphics.setStrokeStyle({ 
              color: strokeColor, 
              width: strokeWidth,
              alpha: alpha
            });
            
            graphics.moveTo(currentCorner1.x, currentCorner1.z);
            graphics.lineTo(currentCorner2.x, currentCorner2.z);
                         graphics.stroke();
          } else {
            // 기본 상태에서는 투명한 클릭 영역만
            graphics.setStrokeStyle({ 
              color: 0xffffff, 
              width: 25,
              alpha: 0
            });
            graphics.moveTo(currentCorner1.x, currentCorner1.z);
            graphics.lineTo(currentCorner2.x, currentCorner2.z);
            graphics.stroke();
          }
        }}
        interactive={true}
        buttonMode={true}
        cursor={isDragging ? "grabbing" : "grab"}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerUpOutside={handlePointerUp}
        onPointerMove={handlePointerMove}
        zIndex={1000} // 인터랙티브 요소로 높은 우선순위
      />

             {/* 드래그 미리보기 벽들 */}
       {isDragging && dragPreviewWalls.map(previewWall => (
         <pixiGraphics
           key={`wall-preview-${previewWall.archiId}`}
           draw={(graphics) => {
             graphics.clear();
             graphics.setStrokeStyle({ 
               color: 0x3b82f6, // 파란색
               width: 15,
               alpha: 0.6
             });
             
             graphics.moveTo(previewWall.previewStart.x, previewWall.previewStart.z);
             graphics.lineTo(previewWall.previewEnd.x, previewWall.previewEnd.z);
             graphics.stroke();
           }}
         />
       ))}

       {/* 드래그 중인 벽 자체의 미리보기 */}
       {isDragging && constraintAxis === 'vertical' && (
         <pixiGraphics
           draw={(graphics) => {
             graphics.clear();
             graphics.setStrokeStyle({ 
               color: 0x3b82f6, // 파란색 (일관된 색상)
               width: 18,
               alpha: 0.8
             });
             
             // 수직 이동 시 AB 벽의 새로운 길이로 미리보기
             const wallVector = {
               x: corner2.position.x - corner1.position.x,
               z: corner2.position.z - corner1.position.z
             };
             const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.z * wallVector.z);
             const perpUnit = {
               x: -wallVector.z / wallLength,
               z: wallVector.x / wallLength
             };
             
             const totalMovement = {
               x: currentWallCenter.x - wallCenter.x,
               z: currentWallCenter.z - wallCenter.z
             };
             
             const wallMovement = totalMovement.x * perpUnit.x + totalMovement.z * perpUnit.z;

             // 새로운 A, B 위치 계산 (실제 로직과 동일)
             const corner1ConnectedWalls = walls.filter(w => 
               w.archiId !== wall.archiId && w.corners.includes(corner1.archiId)
             );
             const corner2ConnectedWalls = walls.filter(w => 
               w.archiId !== wall.archiId && w.corners.includes(corner2.archiId)
             );

             if (corner1ConnectedWalls.length > 0 && corner2ConnectedWalls.length > 0) {
               // A의 새 위치
               const wall1 = corner1ConnectedWalls[0];
               const otherCorner1Id = wall1.corners.find(id => id !== corner1.archiId);
               const otherCorner1 = corners.find(c => c.archiId === otherCorner1Id);
               
               // B의 새 위치
               const wall2 = corner2ConnectedWalls[0];
               const otherCorner2Id = wall2.corners.find(id => id !== corner2.archiId);
               const otherCorner2 = corners.find(c => c.archiId === otherCorner2Id);

               if (otherCorner1 && otherCorner2) {
                 const wall1Vector = {
                   x: corner1.position.x - otherCorner1.position.x,
                   z: corner1.position.z - otherCorner1.position.z
                 };
                 const wall1Length = Math.sqrt(wall1Vector.x * wall1Vector.x + wall1Vector.z * wall1Vector.z);
                 const wall1Unit = {
                   x: wall1Vector.x / wall1Length,
                   z: wall1Vector.z / wall1Length
                 };

                 const wall2Vector = {
                   x: corner2.position.x - otherCorner2.position.x,
                   z: corner2.position.z - otherCorner2.position.z
                 };
                 const wall2Length = Math.sqrt(wall2Vector.x * wall2Vector.x + wall2Vector.z * wall2Vector.z);
                 const wall2Unit = {
                   x: wall2Vector.x / wall2Length,
                   z: wall2Vector.z / wall2Length
                 };

                 // 드래그 방향과 연결된 벽 방향의 일치성 확인
                 const dragVector = {
                   x: currentWallCenter.x - wallCenter.x,
                   z: currentWallCenter.z - wallCenter.z
                 };

                 const dotProduct1 = dragVector.x * wall1Unit.x + dragVector.z * wall1Unit.z;
                 const movement1 = dotProduct1 > 0 ? Math.abs(wallMovement) : -Math.abs(wallMovement);

                 const dotProduct2 = dragVector.x * wall2Unit.x + dragVector.z * wall2Unit.z;
                 const movement2 = dotProduct2 > 0 ? Math.abs(wallMovement) : -Math.abs(wallMovement);

                 const newA = {
                   x: otherCorner1.position.x + wall1Unit.x * (wall1Length + movement1),
                   z: otherCorner1.position.z + wall1Unit.z * (wall1Length + movement1)
                 };

                 const newB = {
                   x: otherCorner2.position.x + wall2Unit.x * (wall2Length + movement2),
                   z: otherCorner2.position.z + wall2Unit.z * (wall2Length + movement2)
                 };

                 // 새로운 AB 벽 그리기
                 graphics.moveTo(newA.x, newA.z);
                 graphics.lineTo(newB.x, newB.z);
                 graphics.stroke();
               }
             }
           }}
         />
       )}

       {/* 가이드라인 제거됨 - 단순화 */}
    </>
  );
};

export default Wall2DDragOverlay; 