import React, { useMemo, useState } from 'react';
import * as THREE from 'three';
import { logicalTo3D, createVector3FromLogical } from '../../utils/coordinateUtils';

/**
 * BufferGeometry로 직접 폴리곤 생성 (XZ 평면에 바닥 생성)
 */
function createRoomPolygonGeometry(points, height, THREE) {
  if (points.length < 3) return null;

  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const numPoints = points.length;

  // 상단면 (바닥): y = height
  for (let i = 0; i < numPoints; i++) {
    const point = points[i];
    vertices.push(point.x, height, point.z);
    normals.push(0, 1, 0); // 위쪽 방향
    uvs.push(point.x / 50, point.z / 50); // 간단한 UV 매핑
  }

  // 상단면 인덱스 (반시계방향 - Three.js 기본)
  // 삼각형의 경우: 0, 1, 2
  // 사각형 이상의 경우: 0을 중심으로 fan 방식
  for (let i = 1; i < numPoints - 1; i++) {
    indices.push(0, i, i + 1);
  }
  
  // 디버깅: 삼각형 면 생성 확인
  if (numPoints === 3) {
    console.log('🔺 삼각형 룸 면 생성:', {
      points: points.map(p => `(${p.x.toFixed(2)}, ${p.z.toFixed(2)})`),
      indices: indices.slice(0, 3),
      height
    });
  }

  let vertexIndex = numPoints;

  // 하단면: y = 0 (바닥 아래, 보이지 않지만 완전한 geometry를 위해)
  for (let i = 0; i < numPoints; i++) {
    const point = points[i];
    vertices.push(point.x, 0, point.z);
    normals.push(0, -1, 0); // 아래쪽 방향
    uvs.push(point.x / 50, point.z / 50);
  }

  // 하단면 인덱스 (시계방향 - 반대 방향)
  for (let i = 1; i < numPoints - 1; i++) {
    indices.push(vertexIndex, vertexIndex + i + 1, vertexIndex + i);
  }

  vertexIndex += numPoints;

  // 사이드 면들 (각 변마다)
  for (let i = 0; i < numPoints; i++) {
    const next = (i + 1) % numPoints;
    const curr = points[i];
    const nextPoint = points[next];

    // 상단 점들
    vertices.push(curr.x, height, curr.z);
    vertices.push(nextPoint.x, height, nextPoint.z);
    
    // 하단 점들
    vertices.push(curr.x, 0, curr.z);
    vertices.push(nextPoint.x, 0, nextPoint.z);

    // 사이드 노말 계산
    const edge = nextPoint.clone().sub(curr);
    const up = new THREE.Vector3(0, 1, 0);
    const sideNormal = edge.clone().cross(up).normalize();
    
    normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
    normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
    normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
    normals.push(sideNormal.x, sideNormal.y, sideNormal.z);

    uvs.push(0, 0);
    uvs.push(1, 0);
    uvs.push(0, 1);
    uvs.push(1, 1);

    const baseIdx = vertexIndex;
    indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
    indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
    vertexIndex += 4;
  }

  // BufferGeometry 생성
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

const Room3D = ({ room, corners }) => {
  const { geometry, debugInfo } = useMemo(() => {
    const roomCorners = room.corners.map(cornerId => 
      corners.find(c => c.archiId === cornerId)
    ).filter(Boolean);

    if (roomCorners.length < 3) {
      return { geometry: null, debugInfo: null };
    }

    // 코너들을 시계방향으로 정렬 (2D와 동일하게 유지)
    const sortedCorners = [...roomCorners].sort((a, b) => {
      const centerX = roomCorners.reduce((sum, c) => sum + c.position.x, 0) / roomCorners.length;
      const centerZ = roomCorners.reduce((sum, c) => sum + c.position.z, 0) / roomCorners.length;
      
      const angleA = Math.atan2(a.position.z - centerZ, a.position.x - centerX);
      const angleB = Math.atan2(b.position.z - centerZ, b.position.x - centerX);
      
      // 시계방향 정렬 (각도 오름차순) - 2D와 동일
      return angleA - angleB;
    });

    // 원본 2D 좌표
    const originalPoints = sortedCorners.map(c => ({ 
      x: c.position.x, 
      z: c.position.z,
      id: c.archiId
    }));
    
    // 3D 좌표로 변환 (XZ 평면)
    // 벽과 동일한 코너 좌표를 사용하므로 그대로 사용
    const worldVertices = sortedCorners.map(corner => {
      return createVector3FromLogical(
        { x: corner.position.x, z: corner.position.z, y: 0 },
        THREE
      );
    });

    // BufferGeometry로 폴리곤 직접 생성
    const floorHeight = 0.1; // 바닥 높이 (더 보이도록 높임)
    const geometry = createRoomPolygonGeometry(worldVertices, floorHeight, THREE);

    // 디버깅 정보
    const boundingBox = new THREE.Box3().setFromPoints(worldVertices);
    const debugInfo = {
      roomId: room.archiId,
      cornerCount: sortedCorners.length,
      originalPoints,
      worldVertices: worldVertices.map(v => ({ x: v.x, y: v.y, z: v.z })),
      boundingBox: {
        min: { x: boundingBox.min.x.toFixed(2), y: boundingBox.min.y.toFixed(2), z: boundingBox.min.z.toFixed(2) },
        max: { x: boundingBox.max.x.toFixed(2), y: boundingBox.max.y.toFixed(2), z: boundingBox.max.z.toFixed(2) }
      },
      method: 'BufferGeometry (직접 폴리곤 생성)'
    };

    return { geometry, debugInfo };
  }, [room, corners]);

  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState(false);

  if (!geometry) {
    return null;
  }

  // 각 룸을 구분하기 위한 고유 색상
  const roomColors = ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa'];
  const roomIndex = parseInt(room.archiId.split('_')[2]?.slice(-1) || '0', 36) % roomColors.length;
  const roomColor = roomColors[roomIndex];

  return (
    <mesh
      name={`Room:${room.archiId}`}
      userData={{ type: 'room', id: room.archiId }}
      geometry={geometry}
      position={[0, 0, 0]}
      receiveShadow
      castShadow
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
      onPointerDown={(e) => { e.stopPropagation(); setSelected((s) => !s); }}
    >
      <meshLambertMaterial
        color={selected ? '#1d4ed8' : (hovered ? '#60a5fa' : roomColor)}
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export default Room3D;