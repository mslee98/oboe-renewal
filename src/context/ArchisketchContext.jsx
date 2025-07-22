import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { 
  createCorner, 
  createRoom, 
  calculateArea, 
  calculateInnerPoints 
} from '../types/archisketchTypes';

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
  const [rooms, setRooms] = useState([]);
  const [selectedCornerId, setSelectedCornerId] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  // 모서리 포인트 추가
  const addCorner = useCallback((position) => {
    const newCorner = createCorner(position);
    setCorners(prev => [...prev, newCorner]);
    console.log('새 모서리 포인트 추가:', newCorner);
    return newCorner;
  }, []);

  // 모서리 포인트 업데이트
  const updateCorner = useCallback((archiId, updates) => {
    setCorners(prev => prev.map(corner => 
      corner.archiId === archiId 
        ? { ...corner, ...updates }
        : corner
    ));
  }, []);

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
    rooms,
    selectedCornerId,
    selectedRoomId,
    selectedCorner,
    selectedRoom,
    
    // 액션
    addCorner,
    updateCorner,
    deleteCorner,
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