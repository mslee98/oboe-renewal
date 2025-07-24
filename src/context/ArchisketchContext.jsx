import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { 
  createCorner, 
  createRoom, 
  calculateArea, 
  calculateInnerPoints 
} from '../types/archisketchTypes';

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

  // 모서리 포인트 추가
  const addCorner = useCallback((position) => {
    
    const newCorner = {
      archiId: uuidv4(),
      position
    };

    // setCorners(prev => [...prev, newCorner]);
    
    setCorners(prev => {
      const updatedCorners = [...prev, newCorner];
      return updatedCorners;
    });
    
    return newCorner;
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
    console.log('=== 벽 추가 시작 ===');
    console.log('addWallWithCorners 호출:', { 
      start: `${startCorner.archiId}(${startCorner.position.x},${startCorner.position.z})`,
      end: `${endCorner.archiId}(${endCorner.position.x},${endCorner.position.z})`
    });
    
    if (!startCorner || !endCorner) {
      console.error('시작점 또는 끝점 코너가 없습니다.');
      return null;
    }
    
    // 중복 벽 체크
    const existingWall = walls.find(wall => 
      (wall.corners[0] === startCorner.archiId && wall.corners[1] === endCorner.archiId) ||
      (wall.corners[0] === endCorner.archiId && wall.corners[1] === startCorner.archiId)
    );
    
    if (existingWall) {
      console.log('⚠️ 중복 벽 감지 - 추가하지 않음:', existingWall.archiId);
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
    
    console.log('새 벽 추가:', newWall);
    console.log('추가 전 벽 목록:', walls.map(w => `${w.archiId}: ${w.corners.join('-')}`));
    
    setWalls(prev => {
      const updated = [...prev, newWall];
      console.log('추가 후 벽 목록:', updated.map(w => `${w.archiId}: ${w.corners.join('-')}`));
      return updated;
    });
    
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

  // 방 추가
  const addRoom = useCallback((cornerIds) => {
    if (cornerIds.length < 3) {
      console.error('방을 만들려면 최소 3개의 모서리가 필요합니다.');
      return null;
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
  }, [corners]);

  // 실제 Room 영역 감지 (새로운 접근 방식)
  const detectAndCreateRooms = useCallback(() => {
    console.log('=== Room 영역 감지 시작 (새로운 방식) ===');
    console.log('입력 데이터:');
    console.log('  - 코너 수:', corners.length);
    console.log('  - 벽 수:', walls.length);
    console.log('  - 기존 Room 수:', rooms.length);
    
    // 코너와 벽 상세 정보
    console.log('코너 목록:', corners.map(c => `${c.archiId}(${c.position.x},${c.position.z})`));
    console.log('벽 목록:', walls.map(w => `${w.archiId}: ${w.corners[0]}-${w.corners[1]}`));
    
    // 이미 생성된 방들의 코너 조합들 저장 (중복 방지)
    const existingRoomCorners = new Set(
      rooms.map(room => room.corners.slice().sort().join(','))
    );
    
    const foundRooms = [];
    
    // 면이 있는지 확인하는 함수 (Triangulation 방식)
    const findMinimalRooms = () => {
      console.log('🔍 최소 Room 영역 탐지 시작');
      
      // 모든 삼각형부터 시작 (가장 기본적인 면)
      for (let i = 0; i < corners.length; i++) {
        for (let j = i + 1; j < corners.length; j++) {
          for (let k = j + 1; k < corners.length; k++) {
            const corner1 = corners[i];
            const corner2 = corners[j];
            const corner3 = corners[k];
            
            // 이 3개 코너가 모두 벽으로 연결되어 있는지 확인
            const hasWall12 = walls.some(wall => 
              (wall.corners.includes(corner1.archiId) && wall.corners.includes(corner2.archiId))
            );
            const hasWall23 = walls.some(wall => 
              (wall.corners.includes(corner2.archiId) && wall.corners.includes(corner3.archiId))
            );
            const hasWall31 = walls.some(wall => 
              (wall.corners.includes(corner3.archiId) && wall.corners.includes(corner1.archiId))
            );
            
            if (hasWall12 && hasWall23 && hasWall31) {
              const triangleCorners = [corner1.archiId, corner2.archiId, corner3.archiId];
              const triangleKey = triangleCorners.slice().sort().join(',');
              
              if (!existingRoomCorners.has(triangleKey)) {
                console.log(`🔺 삼각형 발견: [${triangleCorners.join(',')}]`);
                
                // 면적 계산
                const positions = [
                  { x: corner1.position.x, z: corner1.position.z },
                  { x: corner2.position.x, z: corner2.position.z },
                  { x: corner3.position.x, z: corner3.position.z }
                ];
                const area = calculatePolygonArea(positions);
                
                if (area > 500) { // 최소 면적 필터
                  foundRooms.push({
                    corners: triangleCorners,
                    area: area,
                    type: 'triangle'
                  });
                  console.log(`  ✅ 유효한 삼각형 (면적: ${area})`);
                } else {
                  console.log(`  ❌ 면적 너무 작음 (${area})`);
                }
              }
            }
          }
        }
      }
      
      // 사각형도 확인 (4개 코너)
      for (let i = 0; i < corners.length; i++) {
        for (let j = i + 1; j < corners.length; j++) {
          for (let k = j + 1; k < corners.length; k++) {
            for (let l = k + 1; l < corners.length; l++) {
              const cornerIds = [corners[i].archiId, corners[j].archiId, corners[k].archiId, corners[l].archiId];
              
              // 사각형의 가능한 연결 패턴들 확인
              const possibleQuads = [
                [0, 1, 2, 3], // 순서대로
                [0, 1, 3, 2], // 다른 순서
                [0, 2, 1, 3], // 또 다른 순서
                [0, 2, 3, 1], 
                [0, 3, 1, 2],
                [0, 3, 2, 1]
              ];
              
              for (const pattern of possibleQuads) {
                const orderedCorners = pattern.map(idx => cornerIds[idx]);
                
                // 이 순서로 벽들이 연결되어 있는지 확인
                let isValidQuad = true;
                for (let m = 0; m < 4; m++) {
                  const corner1 = orderedCorners[m];
                  const corner2 = orderedCorners[(m + 1) % 4];
                  
                  const hasWall = walls.some(wall => 
                    (wall.corners.includes(corner1) && wall.corners.includes(corner2))
                  );
                  
                  if (!hasWall) {
                    isValidQuad = false;
                    break;
                  }
                }
                
                if (isValidQuad) {
                  const quadKey = orderedCorners.slice().sort().join(',');
                  
                  if (!existingRoomCorners.has(quadKey)) {
                    // 이 사각형이 내부에 대각선(벽)을 가지고 있는지 확인
                    const hasDiagonalWalls = () => {
                      // 사각형의 대각선 확인 (모든 가능한 대각선 조합)
                      for (let x = 0; x < 4; x++) {
                        for (let y = x + 2; y < 4; y++) {
                          if (y - x === 2 || (x === 0 && y === 3)) { // 대각선 관계
                            const corner1 = orderedCorners[x];
                            const corner2 = orderedCorners[y];
                            
                            const hasDiagonal = walls.some(wall => 
                              (wall.corners.includes(corner1) && wall.corners.includes(corner2))
                            );
                            
                            if (hasDiagonal) {
                              console.log(`  대각선 벽 발견: ${corner1} - ${corner2}`);
                              return true;
                            }
                          }
                        }
                      }
                      return false;
                    };
                    
                    if (!hasDiagonalWalls()) {
                      const positions = orderedCorners.map(cornerId => {
                        const corner = corners.find(c => c.archiId === cornerId);
                        return { x: corner.position.x, z: corner.position.z };
                      });
                      const area = calculatePolygonArea(positions);
                      
                      if (area > 1000) {
                        foundRooms.push({
                          corners: orderedCorners,
                          area: area,
                          type: 'quad'
                        });
                        console.log(`🟦 사각형 발견: [${orderedCorners.join(',')}] (면적: ${area})`);
                      }
                    } else {
                      console.log(`🚫 사각형 스킵 (내부에 대각선 존재): [${orderedCorners.join(',')}]`);
                    }
                  }
                  break; // 하나의 유효한 패턴을 찾으면 더 이상 확인하지 않음
                }
              }
            }
          }
        }
      }
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
    findMinimalRooms();
    
    // 찾은 Room들을 실제로 생성
    foundRooms.forEach(roomData => {
      console.log(`🏠 Room 생성: [${roomData.corners.join(',')}] (${roomData.type}, 면적: ${roomData.area})`);
      const newRoom = addRoom(roomData.corners);
      if (newRoom) {
        console.log('✅ Room 생성 완료:', newRoom.archiId);
      }
    });
    
    console.log(`총 ${foundRooms.length}개의 새로운 Room 발견`);
  }, [corners, walls, rooms, addRoom]);

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
        detectAndCreateRooms();
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
  }, [walls, detectAndCreateRooms]); // walls 전체 배열을 감지

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
