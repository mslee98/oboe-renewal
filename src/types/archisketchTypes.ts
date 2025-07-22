// 아키스케치 스타일 데이터 구조

// 모서리 포인트 타입
export interface Corner {
  archiId: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
}

// 바닥재/천장재 타입
export interface Finish {
  id: string;
  productId: string | null;
  color: string;
  meta: any; // 실제로는 더 복잡한 구조
  scheme: any;
  offset: {
    x: number;
    y: number;
  };
  rotation: number;
  surface: any;
}

// 방 타입
export interface Room {
  archiId: string;
  templateId: string | null;
  corners: string[]; // corner archiId 배열
  height: number;
  level: number;
  label: string;
  type: number;
  hideCeiling: boolean;
  finish: Finish;
  ceiling: Finish;
  innerPoints: Array<{
    x: number;
    y: number;
    z: number;
  }>;
  lock: boolean;
  visible: boolean;
  items: any[];
  seats: number;
  area: number;
}

// 프로젝트 타입
export interface Project {
  corners: Corner[];
  rooms: Room[];
}

// 모서리 포인트 생성 함수
export const createCorner = (position: { x: number; y: number; z: number }): Corner => {
  return {
    archiId: `corner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    position
  };
};

// 방 생성 함수
export const createRoom = (
  corners: string[],
  innerPoints: Array<{ x: number; y: number; z: number }>,
  area: number
): Room => {
  return {
    archiId: `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    templateId: null,
    corners,
    height: 1150, // 기본 높이
    level: 0,
    label: "",
    type: 0,
    hideCeiling: false,
    finish: {
      id: `finish_${Date.now()}`,
      productId: null,
      color: "ffffff",
      meta: null,
      scheme: null,
      offset: { x: 0, y: 0 },
      rotation: 0,
      surface: null
    },
    ceiling: {
      id: `ceiling_${Date.now()}`,
      productId: null,
      color: "f2f2f2",
      meta: null,
      scheme: null,
      offset: { x: 0, y: 0 },
      rotation: 0,
      surface: null
    },
    innerPoints,
    lock: false,
    visible: true,
    items: [],
    seats: 0,
    area
  };
};

// 면적 계산 함수
export const calculateArea = (points: Array<{ x: number; z: number }>): number => {
  if (points.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].z;
    area -= points[j].x * points[i].z;
  }
  
  return Math.abs(area) / 2;
};

// 내부 포인트 계산 함수 (벽 두께 고려)
export const calculateInnerPoints = (
  corners: Array<{ x: number; z: number }>,
  wallThickness: number = 50
): Array<{ x: number; y: number; z: number }> => {
  return corners.map(point => ({
    x: point.x + (point.x > 0 ? -wallThickness : wallThickness),
    y: 0,
    z: point.z + (point.z > 0 ? -wallThickness : wallThickness)
  }));
}; 