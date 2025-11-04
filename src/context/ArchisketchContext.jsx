import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { 
  createCorner, 
  createRoom, 
  calculateArea, 
  calculateInnerPoints 
} from '../types/archisketchTypes';
import { pixelToLogical, logicalToPixel } from '../utils/coordinateUtils';

import { v4 as uuidv4 } from 'uuid';

const ArchisketchContext = createContext();

export const useArchisketch = () => {
  const context = useContext(ArchisketchContext);
  if (!context) {
    throw new Error('useArchisketch must be used within an ArchisketchProvider');
  }
  return context;
};

export const ArchisketchProvider = ({ children }) => {
  const [corners, setCorners] = useState([]);
  const [walls, setWalls] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedCornerId, setSelectedCornerId] = useState(null);
  const [selectedWallId, setSelectedWallId] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  // 모서리 포인트 추가 (픽셀 좌표를 논리적 단위로 변환하여 저장)
  const addCorner = useCallback((pixelPosition) => {
    console.log("🔵 addCorner 호출됨 - 입력 좌표:", {
      입력값: pixelPosition,
      x: pixelPosition.x,
      y: pixelPosition.y,
      z: pixelPosition.z,
      absX: Math.abs(pixelPosition.x),
      absZ: Math.abs(pixelPosition.z)
    });
    
    // 픽셀 → 논리적 단위(미터) 변환
    const logicalPosition = {
      x: pixelPosition.x || 0,
      y: pixelPosition.y || 0,
      z: pixelPosition.z || 0
    };
    
    // 픽셀 좌표인 경우 변환 (절댓값이 100 이상이면 픽셀, 작은 값이면 이미 논리적)
    // 음수도 고려하여 절댓값으로 체크
    const absX = Math.abs(pixelPosition.x);
    const absZ = Math.abs(pixelPosition.z);
    const isPixel = absX > 100 || absZ > 100;
    
    if (isPixel) {
      // 픽셀 좌표로 판단 → 논리적 단위로 변환
      const converted = pixelToLogical({ x: pixelPosition.x, z: pixelPosition.z });
      logicalPosition.x = converted.x;
      logicalPosition.z = converted.z;
      console.log("  → 픽셀 좌표로 판단, 논리적 단위로 변환:", {
        픽셀: { x: pixelPosition.x, z: pixelPosition.z },
        논리적: converted,
        판단기준: `|x|=${absX}, |z|=${absZ}`
      });
    } else {
      console.log("  → 논리적 좌표로 판단, 그대로 사용:", logicalPosition);
    }
    
    const newCorner = {
      archiId: uuidv4(),
      position: logicalPosition  // 논리적 단위로 저장
    };
    
    console.log("✅ 코너 생성 완료:", {
      id: newCorner.archiId,
      최종저장위치: newCorner.position,
      논리적좌표: { x: newCorner.position.x, z: newCorner.position.z }
    });
    
    setCorners(prev => {
      const updatedCorners = [...prev, newCorner];
      return updatedCorners;
    });
    
    return newCorner;
  }, []);

  // 코너 위치 업데이트 (벽 드래그용)
  const updateCornerPosition = useCallback((cornerId, newPosition) => {
    setCorners(prev => {
      const updatedCorners = prev.map(corner => 
        corner.archiId === cornerId 
          ? { ...corner, position: newPosition }
          : corner
      );
      console.log(`📍 코너 위치 업데이트: ${cornerId} → (${newPosition.x}, ${newPosition.z})`);
      return updatedCorners;
    });
  }, []);



  const addWall = useCallback((startCornerId, endCornerId) => {
    const startCorner = corners.find(c => c.archiId === startCornerId);
    const endCorner = corners.find(c => c.archiId === endCornerId);
    
    if (!startCorner || !endCorner) {
      console.error('시작점 또는 끝점 코너를 찾을 수 없습니다.');
      return null;
    }
    
    const length = Math.sqrt(
      Math.pow(endCorner.position.x - startCorner.position.x, 2) + 
      Math.pow(endCorner.position.z - startCorner.position.z, 2)
    );
    
    const newWall = {
      archiId: uuidv4(),
      corners: [startCornerId, endCornerId],
      length,
      thickness: 100,
      height: 2400,
      material: "concrete",
      visible: true
    };
    
    setWalls(prev => [...prev, newWall]);

    console.log('walls', walls);
    return newWall;
  }, [corners]);

  const addWallWithCorners = useCallback((startCorner, endCorner) => {
    if (!startCorner || !endCorner) {
      console.error('벽 추가 실패: 시작점 또는 끝점 코너가 없습니다.');
      return null;
    }
    
    // 중복 벽 체크
    const existingWall = walls.find(wall => 
      (wall.corners[0] === startCorner.archiId && wall.corners[1] === endCorner.archiId) ||
      (wall.corners[0] === endCorner.archiId && wall.corners[1] === startCorner.archiId)
    );
    
    if (existingWall) {
      return existingWall;
    }
    
    // 벽 길이 계산
    const length = Math.sqrt(
      Math.pow(endCorner.position.x - startCorner.position.x, 2) + 
      Math.pow(endCorner.position.z - startCorner.position.z, 2)
    );
    
    // 벽 객체 생성
    const newWall = {
      archiId: uuidv4(),
      corners: [startCorner.archiId, endCorner.archiId],
      length,
      thickness: 100,
      height: 2400,
      material: "concrete",
      visible: true
    };
    
    setWalls(prev => [...prev, newWall]);
    
    return newWall;
  }, [walls]);

  // 모서리 포인트 업데이트 - 벽 길이 재계산 포함
  const updateCorner = useCallback((archiId, updates, groupMove = false) => {
    console.log('updateCorner 호출:', { archiId, updates, groupMove });
    
    if (!groupMove) {
      // 일반 이동: 같은 위치에 있는 다른 코너들도 함께 이동
      const currentCorner = corners.find(c => c.archiId === archiId);
      if (currentCorner && updates.position) {
        const cornersAtSamePosition = corners.filter(c => {
          if (c.archiId === archiId) return false;
          const distance = Math.sqrt(
            Math.pow(c.position.x - currentCorner.position.x, 2) + 
            Math.pow(c.position.z - currentCorner.position.z, 2)
          );
          return distance <= 5; // 5px 이내면 같은 위치로 간주
        });
        
        if (cornersAtSamePosition.length > 0) {
          console.log('🔗 그룹 이동 감지:', {
            main: archiId,
            followers: cornersAtSamePosition.map(c => c.archiId)
          });
          
          // 함께 있던 코너들도 같이 이동
          cornersAtSamePosition.forEach(followerCorner => {
            setTimeout(() => {
              updateCorner(followerCorner.archiId, updates, true); // groupMove = true로 재귀 방지
            }, 10);
          });
        }
      }
    }
    
    // 코너 업데이트
    setCorners(prev => prev.map(corner => 
      corner.archiId === archiId 
        ? { ...corner, ...updates }
        : corner
    ));
    
    // 해당 코너와 연결된 벽들의 길이 재계산
    setWalls(prev => prev.map(wall => {
      // 이 벽이 업데이트된 코너를 포함하는지 확인
      if (wall.corners && wall.corners.includes(archiId)) {
        console.log('벽 길이 재계산:', wall);
        
        // 벽의 두 코너 찾기
        const corner1 = corners.find(c => c.archiId === wall.corners[0]);
        const corner2 = corners.find(c => c.archiId === wall.corners[1]);
        
        if (corner1 && corner2) {
          // 업데이트된 코너의 새로운 위치 사용
          const updatedCorner1 = wall.corners[0] === archiId 
            ? { ...corner1, ...updates }
            : corner1;
          const updatedCorner2 = wall.corners[1] === archiId 
            ? { ...corner2, ...updates }
            : corner2;
          
          // 새로운 길이 계산
          const newLength = Math.sqrt(
            Math.pow(updatedCorner2.position.x - updatedCorner1.position.x, 2) + 
            Math.pow(updatedCorner2.position.z - updatedCorner1.position.z, 2)
          );
          
          console.log('벽 길이 업데이트:', { 
            oldLength: wall.length, 
            newLength: newLength 
          });
          
          return {
            ...wall,
            length: newLength
          };
        }
      }
      return wall;
    }));
  }, [corners]);

  // 코너 병합 함수 (개선된 버전)
  const mergeCorners = useCallback((targetCornerId, mergeCornerIds) => {
    console.log('🚨🚨🚨 mergeCorners 함수 진입! 🚨🚨🚨');
    console.log('코너 병합 시작:', { targetCornerId, mergeCornerIds });
    
    const targetCorner = corners.find(c => c.archiId === targetCornerId);
    if (!targetCorner) {
      console.error('타겟 코너를 찾을 수 없습니다:', targetCornerId);
      return null;
    }

    // 1단계: 병합될 코너들과 연결된 벽들을 타겟 코너로 리다이렉트
    console.log('=== 벽 리다이렉트 단계 ===');
    console.log('병합 전 벽 목록:', walls.map(w => `${w.archiId}: ${w.corners.join('-')}`));
    
    const updatedWalls = [];
    const wallsToRemove = new Set();

    walls.forEach(wall => {
      let updatedCorners = [...wall.corners];
      let hasChanges = false;
      const originalCorners = [...wall.corners];

      // 병합될 코너들을 타겟 코너로 교체
      mergeCornerIds.forEach(mergeId => {
        for (let i = 0; i < updatedCorners.length; i++) {
          if (updatedCorners[i] === mergeId) {
            updatedCorners[i] = targetCornerId;
            hasChanges = true;
            console.log(`🔄 벽 ${wall.archiId}: ${originalCorners.join('-')} → ${updatedCorners.join('-')}`);
          }
        }
      });

      // 자기 자신으로의 벽 체크 (같은 코너끼리 연결)
      if (updatedCorners[0] === updatedCorners[1]) {
        console.log(`🗑️ 자기 참조 벽 제거: ${wall.archiId} (${updatedCorners.join('-')})`);
        wallsToRemove.add(wall.archiId);
        return;
      }

      const updatedWall = hasChanges ? { ...wall, corners: updatedCorners } : wall;
      updatedWalls.push(updatedWall);
    });
    
    console.log('업데이트된 벽 목록:', updatedWalls.map(w => `${w.archiId}: ${w.corners.join('-')}`));

    // 2단계: 중복 벽 제거 및 무효 벽 정리
    console.log('=== 벽 정리 단계 ===');
    const uniqueWalls = [];
    const seenConnections = new Set();

    updatedWalls.forEach(wall => {
      // 정규화된 연결 키 생성 (순서 무관)
      const [corner1, corner2] = wall.corners.sort();
      const connectionKey = `${corner1}-${corner2}`;

      console.log(`벽 ${wall.archiId} (${wall.corners.join('-')}) → 연결키: ${connectionKey}`);

      // 1. 자기 자신 연결 벽 제거 (이미 위에서 처리했지만 한번 더 확인)
      if (corner1 === corner2) {
        console.log(`❌ 자기 참조 벽 제거: ${wall.archiId} (${connectionKey})`);
        wallsToRemove.add(wall.archiId);
        return;
      }

      // 2. 존재하지 않는 코너를 참조하는 벽 제거
      const corner1Exists = corners.some(c => c.archiId === corner1);
      const corner2Exists = corners.some(c => c.archiId === corner2);
      
      if (!corner1Exists || !corner2Exists) {
        console.log(`❌ 존재하지 않는 코너 참조 벽 제거: ${wall.archiId} (${corner1}:${corner1Exists}, ${corner2}:${corner2Exists})`);
        wallsToRemove.add(wall.archiId);
        return;
      }

      // 3. 중복 연결 벽 제거
      if (seenConnections.has(connectionKey)) {
        console.log(`❌ 중복 벽 제거: ${wall.archiId} (연결: ${connectionKey})`);
        wallsToRemove.add(wall.archiId);
      } else {
        console.log(`✅ 벽 유지: ${wall.archiId} (연결: ${connectionKey})`);
        seenConnections.add(connectionKey);
        uniqueWalls.push(wall);
      }
    });

    console.log('=== 최종 결과 ===');
    console.log('제거될 벽들:', Array.from(wallsToRemove));
    console.log('유지될 벽들:', uniqueWalls.map(w => `${w.archiId}: ${w.corners.join('-')}`));

    // 벽 상태 업데이트
    setWalls(uniqueWalls);

    // 3단계: 병합될 코너들 삭제
    console.log('=== 코너 제거 단계 ===');
    setCorners(prev => {
      console.log('제거 전 코너들:', prev.map(c => `${c.archiId}(${c.position.x},${c.position.z})`));
      const remainingCorners = prev.filter(corner => 
        !mergeCornerIds.includes(corner.archiId)
      );
      console.log('삭제될 코너들:', mergeCornerIds);
      console.log('남은 코너들:', remainingCorners.map(c => `${c.archiId}(${c.position.x},${c.position.z})`));
      return remainingCorners;
    });

    // 4단계: Room 정리 및 업데이트
    console.log('=== Room 정리 단계 ===');
    setRooms(prev => {
      console.log('정리 전 Room들:', prev.map(r => `${r.archiId}: [${r.corners.join(',')}]`));
      
      const updatedRooms = [];
      const processedRoomKeys = new Set();
      
      prev.forEach(room => {
        let updatedCorners = [...room.corners];
        let hasChanges = false;

        // 병합될 코너들을 타겟 코너로 교체
        mergeCornerIds.forEach(mergeId => {
          const index = updatedCorners.indexOf(mergeId);
          if (index !== -1) {
            updatedCorners[index] = targetCornerId;
            hasChanges = true;
          }
        });

        // 중복 코너 제거
        updatedCorners = [...new Set(updatedCorners)];
        
        // 유효하지 않은 Room 제거 (코너가 3개 미만)
        if (updatedCorners.length < 3) {
          console.log(`❌ 무효 Room 제거: ${room.archiId} (코너 ${updatedCorners.length}개)`);
          return;
        }
        
        // 중복 Room 제거 (같은 코너 조합)
        const roomKey = updatedCorners.slice().sort().join(',');
        if (processedRoomKeys.has(roomKey)) {
          console.log(`❌ 중복 Room 제거: ${room.archiId} (키: ${roomKey})`);
          return;
        }
        
        processedRoomKeys.add(roomKey);
        const finalRoom = hasChanges ? { ...room, corners: updatedCorners } : room;
        updatedRooms.push(finalRoom);
        
        console.log(`✅ Room 유지/업데이트: ${finalRoom.archiId} [${finalRoom.corners.join(',')}]`);
      });
      
      console.log('정리 후 Room들:', updatedRooms.map(r => `${r.archiId}: [${r.corners.join(',')}]`));
      return updatedRooms;
    });

    console.log('코너 병합 완료');
    
    return targetCorner;
  }, [corners, walls]);

  // 모서리 포인트 삭제 (연결된 벽과 Room도 함께 정리)
  const deleteCorner = useCallback((archiId) => {
    console.log('코너 삭제:', archiId);
    
    // 1단계: 해당 코너와 연결된 벽들 찾기 및 삭제
    const connectedWalls = walls.filter(wall => wall.corners.includes(archiId));
    console.log('연결된 벽들:', connectedWalls.map(w => w.archiId));
    
    // 연결된 벽들 삭제
    setWalls(prev => prev.filter(wall => !wall.corners.includes(archiId)));
    
    // 2단계: 코너 삭제
    setCorners(prev => prev.filter(corner => corner.archiId !== archiId));
    
    // 3단계: 해당 코너를 포함하는 모든 Room 삭제
    const affectedRooms = rooms.filter(room => room.corners.includes(archiId));
    console.log('영향받는 Room들:', affectedRooms.map(r => r.archiId));
    
    setRooms(prev => prev.filter(room => !room.corners.includes(archiId)));
    
    // 벽이 변경되면 useEffect가 자동으로 Room 재감지 실행
    console.log('코너 삭제 완료 - useEffect가 Room 재감지 처리');
    
  }, [walls, rooms]);

  // 방 추가 (중복 체크 포함)
  const addRoom = useCallback((cornerIds) => {
    if (cornerIds.length < 3) {
      console.error('방을 만들려면 최소 3개의 모서리가 필요합니다.');
      return null;
    }

    // 중복 체크: 이미 존재하는 룸인지 확인
    const roomKey = cornerIds.slice().sort().join(',');
    const existingRoom = rooms.find(r => 
      r.corners.slice().sort().join(',') === roomKey
    );

    if (existingRoom) {
      console.log('⚠️ 중복 룸 감지 - 추가하지 않음:', existingRoom.archiId);
      return existingRoom;
    }

    // 모서리 포인트들 가져오기
    const cornerPoints = corners.filter(corner => 
      cornerIds.includes(corner.archiId)
    );

    if (cornerPoints.length !== cornerIds.length) {
      console.error('일부 모서리 포인트를 찾을 수 없습니다.');
      return null;
    }

    // 면적 계산
    const points2D = cornerPoints.map(corner => ({
      x: corner.position.x,
      z: corner.position.z
    }));
    const area = calculateArea(points2D);

    // 내부 포인트 계산
    const innerPoints = calculateInnerPoints(points2D);

    // 새 방 생성
    const newRoom = createRoom(cornerIds, innerPoints, area);
    setRooms(prev => [...prev, newRoom]);
    
    console.log('새 방 추가:', newRoom);
    return newRoom;
  }, [corners, rooms]);

  // 실제 Room 영역 감지 (새로운 접근 방식)
  const detectAndCreateRooms = useCallback(() => {
    const foundRooms = [];
    
    // 기존 rooms 상태를 가져와서 중복 체크용 Set 생성
    // 주의: setRooms 내부에서 사용하는 currentRooms와 동기화하기 위해
    // 여기서는 빈 Set으로 시작하고, setRooms 내부에서 실제 중복 체크를 수행
    const existingRoomCorners = new Set();
    
    // 벽으로 완전히 둘러싸인 진짜 Room 감지
    const findRealRooms = () => {
      // 1. 벽 연결 매핑 생성 (정확한 벽 존재 확인용)
      const wallConnections = new Set();
      walls.forEach(wall => {
        const [corner1, corner2] = wall.corners;
        const connectionKey1 = `${corner1}-${corner2}`;
        const connectionKey2 = `${corner2}-${corner1}`;
        wallConnections.add(connectionKey1);
        wallConnections.add(connectionKey2);
      });
      
      // 2. 코너 간 인접 관계 (벽이 있는 경우만)
      const graph = {};
      corners.forEach(corner => {
        graph[corner.archiId] = [];
      });
      
      walls.forEach(wall => {
        const [corner1, corner2] = wall.corners;
        if (graph[corner1] && graph[corner2]) {
          graph[corner1].push(corner2);
          graph[corner2].push(corner1);
        }
      });
      
      // 3. 벽으로만 이루어진 폐곡선 찾기
      const findWalledRooms = () => {
        const localFoundRooms = [];
        const checkedPaths = new Set();
        
        const findRoomFromNode = (startNode, maxDepth = 15) => {
          const stack = [{ node: startNode, path: [startNode], visited: new Set([startNode]) }];
          
          while (stack.length > 0) {
            const { node, path, visited } = stack.pop();
            
            if (path.length > maxDepth) continue;
            
            const neighbors = graph[node] || [];
            for (const neighbor of neighbors) {
              if (neighbor === startNode && path.length >= 3) {
                // 폐곡선 후보 발견! 이제 모든 연결이 벽인지 확인
                const isValidRoom = validateRoomWalls(path);
                
                if (isValidRoom) {
                  const sortedPath = [...path].sort();
                  const pathKey = sortedPath.join(',');
                  
                  if (!checkedPaths.has(pathKey)) {
                    const positions = path.map(cornerId => {
                      const corner = corners.find(c => c.archiId === cornerId);
                      return { x: corner.position.x, z: corner.position.z };
                    });
                    const area = calculatePolygonArea(positions);
                    
                    if (area > 10) {
                      localFoundRooms.push({
                        corners: [...path],
                        area: area,
                        type: `${path.length}각형`,
                        key: pathKey
                      });
                      checkedPaths.add(pathKey);
                    }
                  }
                }
              } else if (!visited.has(neighbor) && neighbor !== path[path.length - 2]) {
                const newVisited = new Set(visited);
                newVisited.add(neighbor);
                stack.push({
                  node: neighbor,
                  path: [...path, neighbor],
                  visited: newVisited
                });
              }
            }
          }
        };
        
        // 벽 연결이 정확한지 확인하고 내부 분할 벽 체크하는 함수
        const validateRoomWalls = (roomPath) => {
          // 1. 경계 벽 존재 확인
          for (let i = 0; i < roomPath.length; i++) {
            const corner1 = roomPath[i];
            const corner2 = roomPath[(i + 1) % roomPath.length];
            const connectionKey = `${corner1}-${corner2}`;
            const reverseKey = `${corner2}-${corner1}`;
            
            const hasWall = wallConnections.has(connectionKey) || wallConnections.has(reverseKey);
            
            if (!hasWall) {
              return false;
            }
          }
          
          // 2. 내부에 분할하는 대각선 벽이 있는지 확인
          const hasDividingWalls = checkForDividingWalls(roomPath);
          if (hasDividingWalls) {
            return false;
          }
          
          return true;
        };
        
        /**
         * 내부 분할 벽 검증 함수
         * - 큰 룸에 내부 분할 벽(대각선 등)이 있으면 true 반환
         * - 이 경우 큰 룸은 무효화되고, 분할 벽을 포함한 작은 룸들이 대신 생성됨
         * 
         * 예시:
         * - 사각형 (A-B-C-D-A) 안에 대각선 벽 (A-C)이 있으면
         * - 큰 사각형은 무효화되고, 삼각형 2개 (A-B-C-A, A-C-D-A)가 생성됨
         */
        const checkForDividingWalls = (roomPath) => {
          // Room의 모든 코너 조합에서 대각선/내부 벽 찾기
          // 인접하지 않은 코너들 사이의 벽은 분할 벽으로 간주
          for (let i = 0; i < roomPath.length; i++) {
            for (let j = i + 2; j < roomPath.length; j++) {
              // 인접하지 않은 코너들 사이의 연결 확인
              if (j === roomPath.length - 1 && i === 0) continue; // 마지막-첫번째는 경계선
              
              const corner1 = roomPath[i];
              const corner2 = roomPath[j];
              const connectionKey1 = `${corner1}-${corner2}`;
              const connectionKey2 = `${corner2}-${corner1}`;
              
              const hasDiagonalWall = wallConnections.has(connectionKey1) || wallConnections.has(connectionKey2);
              
              if (hasDiagonalWall) {
                return true;
              }
            }
          }
          
          return false;
        };
        
        // 모든 코너에서 시작해서 Room 찾기
        corners.forEach(corner => {
          findRoomFromNode(corner.archiId);
        });
        
        return localFoundRooms;
      };
      
      const validRooms = findWalledRooms();
      
      // 4. 면적 기준으로 정렬하고 중복 제거
      validRooms.sort((a, b) => b.area - a.area);
      const uniqueRooms = [];
      const usedKeys = new Set();
      
      for (const room of validRooms) {
        if (!usedKeys.has(room.key)) {
          uniqueRooms.push(room);
          usedKeys.add(room.key);
        }
      }
      
      // foundRooms를 uniqueRooms로 대체
      foundRooms.length = 0;
      foundRooms.push(...uniqueRooms);
    };
    
    // 폴리곤 면적 계산 (Shoelace formula)
    const calculatePolygonArea = (positions) => {
      if (positions.length < 3) return 0;
      
      let area = 0;
      for (let i = 0; i < positions.length; i++) {
        const j = (i + 1) % positions.length;
        area += positions[i].x * positions[j].z;
        area -= positions[j].x * positions[i].z;
      }
      return Math.abs(area) / 2;
    };

    // 실제 Room 탐지 및 생성
    findRealRooms();
    
    // 찾은 Room들의 키를 추출
    const foundRoomKeys = new Set(
      foundRooms.map(r => r.corners.slice().sort().join(','))
    );
    
    // 기존 rooms와 비교하여 추가/제거 결정 (setRooms 내부에서 현재 rooms 상태 사용)
    setRooms(currentRooms => {
      const existingRoomKeys = new Set(
        currentRooms.map(r => r.corners.slice().sort().join(','))
      );
      
      // 새로 추가할 Room들
      const roomsToAdd = foundRooms.filter(roomData => {
        const roomKey = roomData.corners.slice().sort().join(',');
        return !existingRoomKeys.has(roomKey);
      });
      
      // 제거할 Room들 (더 이상 존재하지 않는 룸)
      const roomsToKeep = currentRooms.filter(room => {
        const roomKey = room.corners.slice().sort().join(',');
        return foundRoomKeys.has(roomKey);
      });
      
      // 새 Room들 생성 및 추가
      const newRooms = roomsToAdd.map(roomData => {
        const cornerPoints = corners.filter(c => roomData.corners.includes(c.archiId));
        if (cornerPoints.length !== roomData.corners.length) {
          console.error('Room 생성 실패: 일부 모서리 포인트를 찾을 수 없습니다.', {
            roomData: roomData.corners,
            found: cornerPoints.length,
            expected: roomData.corners.length
          });
          return null;
        }
        
        const points2D = cornerPoints.map(corner => ({
          x: corner.position.x,
          z: corner.position.z
        }));
        const area = calculatePolygonArea(points2D);
        const innerPoints = calculateInnerPoints(points2D);
        
        return createRoom(roomData.corners, innerPoints, area);
      }).filter(Boolean);
      
      return [...roomsToKeep, ...newRooms];
    });
  }, [corners, walls, setRooms]); // rooms, addRoom 제거 - 무한 루프 방지

  // 벽이 추가되거나 변경될 때 자동으로 Room 감지
  useEffect(() => {
    console.log('🔄 useEffect 트리거 - 벽 변경 감지');
    console.log('현재 벽 개수:', walls.length);
    console.log('현재 벽 목록:', walls.map(w => `${w.archiId}: ${w.corners.join('-')}`));
    
    if (walls.length > 0) {
      console.log('⏰ 100ms 후 Room 감지 예약');
      // 100ms 지연 후 감지 (상태 안정화 대기)
      const timer = setTimeout(() => {
        console.log('🚀 Room 감지 시작 (예약된 타이머)');
        console.log('detectAndCreateRooms 함수 타입:', typeof detectAndCreateRooms);
        console.log('detectAndCreateRooms 함수:', detectAndCreateRooms);
        if (typeof detectAndCreateRooms === 'function') {
          detectAndCreateRooms();
        } else {
          console.error('❌ detectAndCreateRooms가 함수가 아닙니다!', detectAndCreateRooms);
        }
      }, 100);
      
      return () => {
        console.log('⏹️ Room 감지 타이머 취소');
        clearTimeout(timer);
      };
    } else if (walls.length === 0) {
      console.log('🧹 모든 벽 삭제됨 - Room 모두 제거');
      // 모든 벽이 삭제되면 모든 Room도 삭제
      setRooms([]);
    }
  }, [walls, detectAndCreateRooms]); // walls 배열 전체를 감지하여 확실하게 트리거

  // 방 업데이트
  const updateRoom = useCallback((archiId, updates) => {
    setRooms(prev => prev.map(room => 
      room.archiId === archiId 
        ? { ...room, ...updates }
        : room
    ));
  }, []);

  // 방 삭제
  const deleteRoom = useCallback((archiId) => {
    setRooms(prev => prev.filter(room => room.archiId !== archiId));
  }, []);

  // 모서리 선택
  const selectCorner = useCallback((archiId) => {
    setSelectedCornerId(archiId);
    setSelectedRoomId(null);
  }, []);

  const selectedWall = useMemo(() => 
    walls.find(wall => wall.archiId === selectedWallId), 
    [walls, selectedWallId]
  );

  // 방 선택
  const selectRoom = useCallback((archiId) => {
    setSelectedRoomId(archiId);
    setSelectedCornerId(null);
  }, []);

  // 선택된 모서리 정보
  const selectedCorner = useMemo(() => 
    corners.find(corner => corner.archiId === selectedCornerId), 
    [corners, selectedCornerId]
  );

  // 선택된 방 정보
  const selectedRoom = useMemo(() => 
    rooms.find(room => room.archiId === selectedRoomId), 
    [rooms, selectedRoomId]
  );

  // 모서리 ID로 모서리 찾기
  const getCornerById = useCallback((archiId) => {
    return corners.find(corner => corner.archiId === archiId);
  }, [corners]);

  // 방의 모서리 포인트들 가져오기
  const getRoomCorners = useCallback((room) => {
    return room.corners.map(cornerId => getCornerById(cornerId)).filter(Boolean);
  }, [getCornerById]);

  const value = {
    // 상태
    corners,
    walls,
    rooms,
    selectedCornerId,
    selectedRoomId,
    selectedCorner,
    selectedRoom,
    
    // 액션
    addCorner,
    updateCorner,
    updateCornerPosition,
    deleteCorner,
    mergeCorners,
    addWall,
    addWallWithCorners,
    addRoom,
    updateRoom,
    deleteRoom,
    selectCorner,
    selectRoom,
    detectAndCreateRooms,
    
    // 유틸리티
    getCornerById,
    getRoomCorners
  };

  return (
    <ArchisketchContext.Provider value={value}>
      {children}
    </ArchisketchContext.Provider>
  );
}; 
