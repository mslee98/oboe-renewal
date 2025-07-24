import { createContext, useContext, useState, useCallback, useMemo } from 'react';
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
    console.log('addWallWithCorners 호출:', { startCorner, endCorner });
    
    if (!startCorner || !endCorner) {
      console.error('시작점 또는 끝점 코너가 없습니다.');
      return null;
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
    console.log('새 벽 추가:', newWall);
    return newWall;
  }, []);

  // 모서리 포인트 업데이트 - 벽 길이 재계산 포함
  const updateCorner = useCallback((archiId, updates) => {
    console.log('updateCorner 호출:', { archiId, updates });
    
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

  // 모서리 포인트 삭제
  const deleteCorner = useCallback((archiId) => {
    setCorners(prev => prev.filter(corner => corner.archiId !== archiId));
    // 해당 모서리를 사용하는 방들도 삭제
    setRooms(prev => prev.filter(room => 
      !room.corners.includes(archiId)
    ));
  }, []);

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
    addWall,
    addWallWithCorners,
    addRoom,
    updateRoom,
    deleteRoom,
    selectCorner,
    selectRoom,
    
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
