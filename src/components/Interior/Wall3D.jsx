import React, { useMemo } from 'react';
import * as THREE from 'three';
import { logicalTo3D, createVector3FromLogical } from '../../utils/coordinateUtils';

const Wall3D = ({ wall, corners }) => {
  const { geometry, position, rotation, debugInfo } = useMemo(() => {
    const startCorner = corners.find(c => c.archiId === wall.corners[0]);
    const endCorner = corners.find(c => c.archiId === wall.corners[1]);
    
    if (!startCorner || !endCorner) return { 
      geometry: null,
      position: [0, 0, 0], 
      rotation: [0, 0, 0],
      debugInfo: null
    };
    
    // 원본 2D 좌표 (논리적 단위)
    const originalStart = { x: startCorner.position.x, z: startCorner.position.z };
    const originalEnd = { x: endCorner.position.x, z: endCorner.position.z };
    
    // 3D 좌표로 변환
    const start = createVector3FromLogical(
      { x: startCorner.position.x, z: startCorner.position.z, y: 0 },
      THREE
    );
    const end = createVector3FromLogical(
      { x: endCorner.position.x, z: endCorner.position.z, y: 0 },
      THREE
    );

    // 벽의 길이와 방향
    const direction = end.clone().sub(start);
    const length = direction.length();
    const angle = Math.atan2(direction.z, direction.x);

    // 벽 두께 (XZ 평면에서의 두께)
    const wallThickness = 0.3;
    const wallHeight = 10;

    // Shape 생성: 벽의 단면 (직사각형 프로파일)
    // 로컬 좌표계에서: X축 = 벽의 길이 방향, Y축 = 벽의 높이 방향
    const shape = new THREE.Shape();
    
    // 사각형 프로파일 생성 (로컬 좌표계)
    // 왼쪽 아래부터 시작해서 시계방향
    shape.moveTo(0, 0);                                    // 왼쪽 아래
    shape.lineTo(length, 0);                               // 오른쪽 아래
    shape.lineTo(length, wallThickness);                   // 오른쪽 위
    shape.lineTo(0, wallThickness);                        // 왼쪽 위
    shape.closePath();

    // ExtrudeGeometry 설정: Y축 방향(높이)으로 돌출
    const extrudeSettings = {
      depth: wallHeight,        // 벽 높이만큼 Y축 방향으로 돌출
      bevelEnabled: false,
      curveSegments: 1
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // ExtrudeGeometry는 XY 평면에 생성되므로 회전 필요
    // 1. Z축 기준으로 각도만큼 회전 (벽의 방향)
    geometry.rotateZ(angle);
    
    // 2. X축 기준 -90도 회전하여 XZ 평면에 배치
    geometry.rotateX(-Math.PI / 2);

    // 3. 시작점 위치로 이동
    geometry.translate(start.x, 0, start.z);

    // 중심점 계산 (디버깅용)
    const center = start.clone().add(end).multiplyScalar(0.5);
    center.y = wallHeight / 2; // 벽 높이의 절반

    // 디버깅 정보
    const debugInfo = {
      wallId: wall.archiId,
      originalStart,
      originalEnd,
      scaledStart: { x: start.x, y: start.y, z: start.z },
      scaledEnd: { x: end.x, y: end.y, z: end.z },
      center: { x: center.x, y: center.y, z: center.z },
      length,
      angle: angle * (180 / Math.PI),
      method: 'ExtrudeGeometry (선 돌출 방식)'
    };

    console.log('🧱 Wall3D 생성 (선 돌출):', debugInfo);

    return {
      geometry,
      position: [0, 0, 0],  // geometry 자체에 위치가 적용되어 있음
      rotation: [0, 0, 0], // geometry 자체에 회전이 적용되어 있음
      debugInfo
    };
  }, [wall, corners]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} position={position} rotation={rotation} castShadow receiveShadow>
      <meshStandardMaterial 
        color="#9ca3af"
        metalness={0.1}
        roughness={0.9}
      />
    </mesh>
  );
};

export default Wall3D;