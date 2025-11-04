import React, { useState, useCallback, useEffect } from 'react';
import { useArchisketch } from '../../context/ArchisketchContext';
import { useTool } from '../../context/ToolContext';
import { logicalToPixel, pixelToLogical, METERS_PER_PIXEL } from '../../utils/coordinateUtils';
import { Rectangle } from 'pixi.js';

const VirtualCornerOverlay = ({ 
  corner, 
  isSnapped
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreviewWalls, setDragPreviewWalls] = useState([]);
  // 논리적 단위 → 픽셀 변환
  const initialPixelPos = logicalToPixel({ x: corner.position.x, z: corner.position.z });
  const [virtualPosition, setVirtualPosition] = useState({ 
    x: initialPixelPos.x, 
    z: initialPixelPos.z 
  }); // 가상 코너 위치 (픽셀)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); // 드래그 시작점 오프셋
  const [snapTarget, setSnapTarget] = useState(null); // 스냅 대상 코너
  const [isSnapMode, setIsSnapMode] = useState(false); // 스냅 모드 활성화
  
  const { updateCorner, walls, corners, mergeCorners } = useArchisketch();
  const { selectedTool } = useTool();

  // 스냅 거리 설정 (Interior2ds.jsx와 동일하게)
  const SNAP_DISTANCE = 60;

  // 근처 코너 찾기 함수 (픽셀 좌표 → 논리적 단위 변환)
  const findNearbyCorner = useCallback((pixelPoint, threshold = SNAP_DISTANCE) => {
    // 픽셀 좌표를 논리적 단위로 변환
    const logicalPoint = pixelToLogical({ x: pixelPoint.x, z: pixelPoint.y || pixelPoint.z });
    
    console.log("스냅 확인:", {
      pixelPosition: pixelPoint,
      logicalPosition: logicalPoint,
      totalCorners: corners.length,
      snapDistance: threshold
    });
    
    const nearbyCorner = corners.find(otherCorner => {
      if (otherCorner.archiId === corner.archiId) return false; // 현재 드래그 중인 코너 제외
      
      // 논리적 단위로 거리 계산
      const distance = Math.sqrt(
        Math.pow(logicalPoint.x - otherCorner.position.x, 2) + 
        Math.pow(logicalPoint.z - otherCorner.position.z, 2)
      );
      
      // threshold도 논리적 단위로 변환
      const logicalThreshold = threshold * METERS_PER_PIXEL;
      
      console.log(`코너 ${otherCorner.archiId} 거리:`, distance, `(threshold: ${logicalThreshold})`);
      
      return distance <= logicalThreshold;
    });
    
    if (nearbyCorner) {
      console.log("스냅 대상 발견:", nearbyCorner);
    }
    
    return nearbyCorner;
  }, [corners]);

  // 특정 위치에 있는 모든 코너 찾기 (병합용)
  const findCornersAtPosition = useCallback((position, threshold = 5) => {
    console.log(`🔍 위치 (${position.x}, ${position.z})에서 반경 ${threshold} 내 코너 찾기:`);
    
    const foundCorners = corners.filter(otherCorner => {
      const distance = Math.sqrt(
        Math.pow(position.x - otherCorner.position.x, 2) + 
        Math.pow(position.z - otherCorner.position.z, 2)
      );
      
      console.log(`  - ${otherCorner.archiId}(${otherCorner.position.x},${otherCorner.position.z}): 거리 ${distance.toFixed(2)}`);
      
      return distance <= threshold;
    });
    
    console.log(`📋 발견된 코너들: ${foundCorners.length}개`);
    foundCorners.forEach(c => console.log(`  → ${c.archiId}(${c.position.x},${c.position.z})`));
    
    return foundCorners;
  }, [corners]);



  // 스냅 이벤트 핸들러 (코너 병합 포함)
  const handleSnapEvent = useCallback((snapTargetCorner, draggedCorner) => {
    console.log("🚨🚨🚨 handleSnapEvent 호출됨! 🚨🚨🚨");
    console.log("스냅 이벤트 발생:", {
      snapTarget: snapTargetCorner,
      dragged: draggedCorner,
      action: "snap_to_corner"
    });
    
    // 스냅 대상 위치로 드래그된 코너 이동
    const snapPosition = {
      x: snapTargetCorner.position.x,
      y: draggedCorner.position.y,
      z: snapTargetCorner.position.z
    };
    
        console.log("📍 코너 위치 업데이트 시작:", {
      cornerId: draggedCorner.archiId,
      from: `(${draggedCorner.position.x}, ${draggedCorner.position.z})`,
      to: `(${snapPosition.x}, ${snapPosition.z})`
    });
    
    // updateCorner를 먼저 실행
    updateCorner(draggedCorner.archiId, {
      position: snapPosition
    });

    // 병합 확인을 위한 임시 상태 저장
    const pendingMergeCheck = {
      snapPosition,
      draggedCornerId: draggedCorner.archiId,
      snapTargetCornerId: snapTargetCorner.archiId,
      timestamp: Date.now()
    };
    
    // 전역 변수나 ref를 사용하여 병합 확인 예약
    window.__pendingMergeCheck = pendingMergeCheck;
    
    console.log("병합 확인 예약:", pendingMergeCheck);
    
  }, [updateCorner, findCornersAtPosition, mergeCorners]);

  // 원본 코너 위치가 변경되면 가상 위치도 동기화 (드래그 중이 아닐 때만)
  useEffect(() => {
    if (!isDragging) {
      const pixelPos = logicalToPixel({ x: corner.position.x, z: corner.position.z });
      setVirtualPosition({ x: pixelPos.x, z: pixelPos.z });
    }
  }, [corner.position.x, corner.position.z, isDragging]);

  // corners 상태 변경 감지하여 병합 확인
  useEffect(() => {
    const pendingCheck = window.__pendingMergeCheck;
    if (!pendingCheck) return;
    
    // 이 컴포넌트의 코너가 관련된 경우에만 처리
    if (pendingCheck.draggedCornerId !== corner.archiId) return;
    
    console.log("corners 상태 변경 감지 - 병합 확인 시작");
    console.log("예약된 병합 확인:", pendingCheck);
    
    // 드래그된 코너가 실제로 스냅 위치로 이동했는지 확인
    const draggedCorner = corners.find(c => c.archiId === pendingCheck.draggedCornerId);
    
    if (draggedCorner) {
      const actualPosition = draggedCorner.position;
      const expectedPosition = pendingCheck.snapPosition;
      
      const distance = Math.sqrt(
        Math.pow(actualPosition.x - expectedPosition.x, 2) + 
        Math.pow(actualPosition.z - expectedPosition.z, 2)
      );
      
      console.log("위치 확인:", {
        expected: `(${expectedPosition.x}, ${expectedPosition.z})`,
        actual: `(${actualPosition.x}, ${actualPosition.z})`,
        distance: distance
      });
      
      if (distance <= 5) { // 위치가 올바르게 업데이트됨
        console.log("코너 위치 업데이트 완료 - 병합 확인 실행");
        
        // 병합 확인 실행
        const cornersAtSnapPosition = findCornersAtPosition(pendingCheck.snapPosition, 5);
        
        console.log("해당 위치의 코너들:", cornersAtSnapPosition.map(c => `${c.archiId} at (${c.position.x}, ${c.position.z})`));
        
        if (cornersAtSnapPosition.length > 1) {
          console.log(`⚠️ ${cornersAtSnapPosition.length}개 코너가 겹침 - 병합 필요!`);
          
          // 스냅 대상을 타겟으로 설정
          const snapTargetCorner = corners.find(c => c.archiId === pendingCheck.snapTargetCornerId);
          const mergeCandidates = cornersAtSnapPosition.filter(c => c.archiId !== snapTargetCorner.archiId);
          
          if (mergeCandidates.length > 0) {
            const mergeIds = mergeCandidates.map(c => c.archiId);
            console.log("🔄 코너 병합 실행:");
            console.log("  - 타겟 코너:", snapTargetCorner.archiId);
            console.log("  - 병합될 코너들:", mergeIds);
            
            console.log("🚨🚨🚨 mergeCorners 함수 호출! 🚨🚨🚨");
            mergeCorners(snapTargetCorner.archiId, mergeIds);
            console.log("🚨🚨🚨 mergeCorners 함수 호출 완료! 🚨🚨🚨");
          }
        } else {
          console.log("겹치는 코너 없음 - 병합 불필요");
        }
        
        // 병합 확인 완료 - 정리
        window.__pendingMergeCheck = null;
      } else {
        console.log("⏳ 코너 위치 아직 업데이트 안됨 - 대기 중...");
      }
    }
  }, [corners, corner.archiId, findCornersAtPosition, mergeCorners]);

  // 연결된 벽들의 미리보기 계산 (픽셀 좌표로 통일)
  const getConnectedWallsPreview = useCallback((cornerId, pixelPosition) => {
    const connectedWalls = walls.filter(wall => 
      wall.corners.includes(cornerId)
    );
    
    return connectedWalls.map(wall => {
      const otherCornerId = wall.corners.find(id => id !== cornerId);
      const otherCorner = corners.find(c => c.archiId === otherCornerId);
      
      if (!otherCorner) return null;
      
      // 다른 코너의 논리적 단위를 픽셀로 변환
      const otherCornerPixel = logicalToPixel({ 
        x: otherCorner.position.x, 
        z: otherCorner.position.z 
      });
      
      // 현재 드래그 중인 코너 위치는 이미 픽셀 좌표 (x, z 형태)
      const currentCornerPixel = { 
        x: pixelPosition.x, 
        z: pixelPosition.z  // z로 통일
      };
      
      return {
        ...wall,
        previewStart: wall.corners[0] === cornerId 
          ? currentCornerPixel 
          : otherCornerPixel,
        previewEnd: wall.corners[1] === cornerId 
          ? currentCornerPixel 
          : otherCornerPixel
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
    let currentSnapTarget = null; // 최신 스냅 대상 추적
    let currentIsSnapMode = false; // 최신 스냅 모드 추적
    
    const onGlobalMove = (moveEvent) => {
      // Interior2ds.jsx와 동일한 방식으로 좌표 가져오기
      const newPosition = moveEvent.data.getLocalPosition(moveEvent.currentTarget);
      console.log("드래그 중 위치:", newPosition);
      
      // 근처 코너 스냅 확인 (Interior2ds.jsx와 동일한 방식)
      const nearbyCorner = findNearbyCorner(newPosition);
      
      if (nearbyCorner) {
        console.log("🎯 스냅 활성화:", nearbyCorner.archiId);
        // 스냅 모드: 논리적 단위 코너를 픽셀로 변환
        const pixelCorner = logicalToPixel({ x: nearbyCorner.position.x, z: nearbyCorner.position.z });
        currentPosition = { x: pixelCorner.x, z: pixelCorner.z };
        currentSnapTarget = nearbyCorner;
        currentIsSnapMode = true;
        setSnapTarget(nearbyCorner);
        setIsSnapMode(true);
        console.log("   → 스냅 모드 ON, 타겟:", nearbyCorner.archiId);
      } else {
        console.log("➡️ 스냅 없음 - 일반 모드");
        // 일반 모드: 마우스 위치 그대로 (이미 픽셀 좌표)
        currentPosition = { x: newPosition.x, z: newPosition.y || newPosition.z };
        currentSnapTarget = null;
        currentIsSnapMode = false;
        setSnapTarget(null);
        setIsSnapMode(false);
        console.log("   → 스냅 모드 OFF");
      }
      
      setVirtualPosition(currentPosition);
      
      // 미리보기 계산 (픽셀 좌표로 전달)
      const previewWalls = getConnectedWallsPreview(corner.archiId, currentPosition);
      setDragPreviewWalls(previewWalls);
    };
    
    const onGlobalUp = () => {
      stage.off('pointermove', onGlobalMove);
      stage.off('pointerup', onGlobalUp);
      stage.off('pointerupoutside', onGlobalUp);
      
      console.log("🎯 드롭 시점 상태 확인:", {
        "React상태_isSnapMode": isSnapMode,
        "React상태_snapTarget": snapTarget?.archiId,
        "로컬변수_currentIsSnapMode": currentIsSnapMode,
        "로컬변수_currentSnapTarget": currentSnapTarget?.archiId,
        currentPosition
      });
      
      // 로컬 변수 사용 (React 상태 업데이트 지연 문제 해결)
      if (currentIsSnapMode && currentSnapTarget) {
        console.log("스냅 이벤트 호출! (로컬 변수 기준)");
        handleSnapEvent(currentSnapTarget, corner);
      } else {
        console.log("일반 모드 위치 업데이트");
        // 일반 모드: 픽셀 좌표를 논리적 단위로 변환하여 저장
        const logicalPosition = pixelToLogical({ x: currentPosition.x, z: currentPosition.z });
        updateCorner(corner.archiId, {
          position: {
            x: logicalPosition.x,
            y: corner.position.y || 0,
            z: logicalPosition.z
          }
        });
      }
      
      // 상태 초기화
      setIsDragging(false);
      setDragPreviewWalls([]);
      setSnapTarget(null);
      setIsSnapMode(false);
      
      console.log("가상 노드 드롭 완료:", corner.archiId, currentPosition, currentIsSnapMode ? "스냅됨" : "일반");
    };
    
    // Stage 레벨에서 이벤트 리스닝 (화면 전체에서 추적)
    stage.on('pointermove', onGlobalMove);
    stage.on('pointerup', onGlobalUp);
    stage.on('pointerupoutside', onGlobalUp);
    
    console.log("가상 노드 드래그 시작:", corner.archiId);
  }, [isSnapped, corner.archiId, virtualPosition, getConnectedWallsPreview, updateCorner, corner.position.y, findNearbyCorner]);

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
            let fillColor = isDragging ? 0x3b82f6 : 0x10b981; // 기본: 드래그 중 파란색, 호버 초록색
            
            // 스냅 모드일 때 색상 변경
            if (isSnapMode && isDragging) {
              fillColor = 0xff6b35; // 스냅 모드: 주황색
            }
            
            const alpha = isDragging ? 0.8 : 0.6;
            const radius = isSnapMode ? 18 : 16; // 스냅 모드일 때 약간 더 크게
            
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
        eventMode="static"
        cursor={isDragging ? "grabbing" : "grab"}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={(event) => {
          event.stopPropagation(); // 이벤트 전파 중단하여 컨테이너가 처리하지 않도록
          handlePointerDown(event);
        }}
        onPointerUp={handlePointerUp}
        onPointerUpOutside={handlePointerUp}
        onPointerMove={handlePointerMove}
        zIndex={10001} // CornerComponent(10000)보다 위에
        hitArea={new Rectangle(-30, -30, 60, 60)}
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
            
            // 픽셀 좌표로 그리기
            graphics.moveTo(wall.previewStart.x, wall.previewStart.z);
            graphics.lineTo(wall.previewEnd.x, wall.previewEnd.z);
            graphics.stroke();
          }}
        />
      ))}
      
      {/* 스냅 대상 표시 */}
      {isSnapMode && snapTarget && (() => {
        const snapTargetPixel = logicalToPixel({ 
          x: snapTarget.position.x, 
          z: snapTarget.position.z 
        });
        return (
          <pixiGraphics
            x={snapTargetPixel.x}
            y={snapTargetPixel.z}
          draw={(graphics) => {
            graphics.clear();
            
            // 스냅 표시용 링 (펄스 효과)
            graphics.setStrokeStyle({ 
              color: 0xff6b35, // 주황색
              width: 3,
              alpha: 0.8
            });
            
            // 바깥쪽 링
            graphics.circle(0, 0, 25);
            graphics.stroke();
            
            // 안쪽 링  
            graphics.setStrokeStyle({ 
              color: 0xff6b35,
              width: 2,
              alpha: 0.6
            });
            graphics.circle(0, 0, 20);
            graphics.stroke();
          }}
        />
        );
      })()}
    </>
  );
};

export default VirtualCornerOverlay; 