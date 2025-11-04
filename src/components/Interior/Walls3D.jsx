import React, { useMemo, useState } from 'react';
import * as THREE from 'three';
import { logicalTo3D, createVector3FromLogical } from '../../utils/coordinateUtils';
import { useThree, useFrame } from '@react-three/fiber';
import { useRef } from 'react';

/**
 * 4개 점으로 폐곡선을 만들고, 그 경로를 따라 BufferGeometry 생성
 * @param {Array<THREE.Vector3>} points - XZ 평면의 점들 (최소 3개)
 * @param {number} height - 벽 높이 (Y축 방향)
 * @param {number} thickness - 벽 두께 (경로 양쪽으로 확장)
 * @param {THREE} THREE - Three.js 객체
 * @returns {THREE.BufferGeometry}
 */
function createWallBufferGeometry(points, height, thickness, THREE) {
  if (points.length < 3) return null;

  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  // 각 점에서 경로의 양쪽으로 두께만큼 확장
  const expandedPoints = [];
  const numPoints = points.length - 1; // 마지막 점은 첫 점과 같음

  for (let i = 0; i < numPoints; i++) {
    const prev = points[(i - 1 + numPoints) % numPoints];
    const curr = points[i];
    const next = points[(i + 1) % numPoints];

    // 현재 세그먼트의 방향 벡터
    const dir = next.clone().sub(curr).normalize();
    
    // 수직 벡터 (XZ 평면에서 시계방향으로 90도 회전)
    const normal = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    
    // 벽의 내부 경계가 코너 좌표와 일치하도록
    // 코너 좌표는 벽의 내부 경계가 되고, 외부로만 확장
    const innerPoint = curr; // 코너 좌표 = 벽의 내부 경계
    const outerPoint = curr.clone().add(normal.clone().multiplyScalar(thickness));
    
    expandedPoints.push({
      left: outerPoint,  // 외부 경계
      center: curr,      // 코너 좌표 (내부 경계)
      right: innerPoint  // 내부 경계 (코너 좌표와 동일)
    });
  }

  // 버텍스 생성: 하단면 → 상단면 → 사이드
  let vertexIndex = 0;

  // 1. 하단면 (y = 0)
  for (let i = 0; i < numPoints; i++) {
    const point = expandedPoints[i];
    vertices.push(point.left.x, 0, point.left.z);
    vertices.push(point.right.x, 0, point.right.z);
    normals.push(0, -1, 0);
    normals.push(0, -1, 0);
    uvs.push(i / numPoints, 0);
    uvs.push(i / numPoints, 1);
  }

  // 하단면 인덱스
  for (let i = 0; i < numPoints; i++) {
    const i0 = vertexIndex + (i * 2);
    const i1 = vertexIndex + ((i + 1) % numPoints) * 2;
    const i2 = vertexIndex + (i * 2 + 1);
    const i3 = vertexIndex + ((i + 1) % numPoints) * 2 + 1;
    
    indices.push(i0, i1, i2);
    indices.push(i2, i1, i3);
  }

  vertexIndex += numPoints * 2;

  // 2. 상단면 (y = height)
  for (let i = 0; i < numPoints; i++) {
    const point = expandedPoints[i];
    vertices.push(point.left.x, height, point.left.z);
    vertices.push(point.right.x, height, point.right.z);
    normals.push(0, 1, 0);
    normals.push(0, 1, 0);
    uvs.push(i / numPoints, 0);
    uvs.push(i / numPoints, 1);
  }

  // 상단면 인덱스
  for (let i = 0; i < numPoints; i++) {
    const i0 = vertexIndex + (i * 2);
    const i1 = vertexIndex + ((i + 1) % numPoints) * 2;
    const i2 = vertexIndex + (i * 2 + 1);
    const i3 = vertexIndex + ((i + 1) % numPoints) * 2 + 1;
    
    indices.push(i0, i2, i1);
    indices.push(i2, i3, i1);
  }

  vertexIndex += numPoints * 2;

  // 3. 사이드 면들 (각 변마다 4개 면)
  for (let i = 0; i < numPoints; i++) {
    const next = (i + 1) % numPoints;
    const currLeft = expandedPoints[i].left;
    const currRight = expandedPoints[i].right;
    const nextLeft = expandedPoints[next].left;
    const nextRight = expandedPoints[next].right;

    // 왼쪽 면 (좌측 바깥쪽)
    vertices.push(currLeft.x, 0, currLeft.z);
    vertices.push(currLeft.x, height, currLeft.z);
    vertices.push(nextLeft.x, 0, nextLeft.z);
    vertices.push(nextLeft.x, height, nextLeft.z);
    
    const leftNormal = nextLeft.clone().sub(currLeft).cross(new THREE.Vector3(0, 1, 0)).normalize();
    normals.push(leftNormal.x, leftNormal.y, leftNormal.z);
    normals.push(leftNormal.x, leftNormal.y, leftNormal.z);
    normals.push(leftNormal.x, leftNormal.y, leftNormal.z);
    normals.push(leftNormal.x, leftNormal.y, leftNormal.z);
    
    uvs.push(0, 0);
    uvs.push(0, 1);
    uvs.push(1, 0);
    uvs.push(1, 1);

    const baseIdx = vertexIndex;
    indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
    indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
    vertexIndex += 4;

    // 오른쪽 면 (우측 바깥쪽)
    vertices.push(nextRight.x, 0, nextRight.z);
    vertices.push(nextRight.x, height, nextRight.z);
    vertices.push(currRight.x, 0, currRight.z);
    vertices.push(currRight.x, height, currRight.z);
    
    const rightNormal = currRight.clone().sub(nextRight).cross(new THREE.Vector3(0, 1, 0)).normalize();
    normals.push(rightNormal.x, rightNormal.y, rightNormal.z);
    normals.push(rightNormal.x, rightNormal.y, rightNormal.z);
    normals.push(rightNormal.x, rightNormal.y, rightNormal.z);
    normals.push(rightNormal.x, rightNormal.y, rightNormal.z);
    
    uvs.push(0, 0);
    uvs.push(0, 1);
    uvs.push(1, 0);
    uvs.push(1, 1);

    const baseIdx2 = vertexIndex;
    indices.push(baseIdx2, baseIdx2 + 1, baseIdx2 + 2);
    indices.push(baseIdx2 + 1, baseIdx2 + 3, baseIdx2 + 2);
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

/**
 * 모든 벽들을 연결된 경로로 만들어서 돌출시키는 컴포넌트
 * 각 벽을 개별적으로 돌출하지 않고, 모든 코너들을 연결한 경로를 따라 돌출
 */
const Walls3D = ({ walls, corners }) => {
  const { camera } = useThree();
  const wallRefs = useRef({});

  const { geometries, debugInfo } = useMemo(() => {
    if (!walls || walls.length === 0 || !corners || corners.length === 0) {
      return { geometries: [], debugInfo: null };
    }

    // 벽 높이와 두께
    const wallHeight = 10;
    const wallThickness = 0.5; // 바닥 틈새 방지를 위해 두께 증가 (0.3 → 0.5)

    // 1. 벽 연결 그래프 구축
    const wallGraph = {};
    corners.forEach(corner => {
      wallGraph[corner.archiId] = [];
    });

    walls.forEach(wall => {
      const [corner1, corner2] = wall.corners;
      if (wallGraph[corner1] && wallGraph[corner2]) {
        wallGraph[corner1].push({
          cornerId: corner2,
          wallId: wall.archiId
        });
        wallGraph[corner2].push({
          cornerId: corner1,
          wallId: wall.archiId
        });
      }
    });

    // 2. 연결된 경로들 찾기 (폐곡선 우선)
    const visitedWalls = new Set();
    const allPaths = [];

    const findPaths = () => {
      // 폐곡선 찾기: 시작점으로 다시 돌아오는 경로
      corners.forEach(startCorner => {
        const neighbors = wallGraph[startCorner.archiId] || [];
        
        neighbors.forEach(startNeighbor => {
          // 이미 방문한 벽이면 건너뛰기
          if (visitedWalls.has(startNeighbor.wallId)) return;

          const path = [startCorner.archiId];
          const pathWalls = [];
          let currentCornerId = startCorner.archiId;
          let nextCornerId = startNeighbor.cornerId;
          let currentWallId = startNeighbor.wallId;
          let maxDepth = walls.length; // 최대 깊이 제한
          let depth = 0;

          // 경로 따라가기
          while (nextCornerId && depth < maxDepth) {
            // 이미 방문한 벽이면 건너뛰기 (단, 시작점으로 돌아오는 경우는 제외)
            if (visitedWalls.has(currentWallId) && nextCornerId !== startCorner.archiId) {
              break;
            }

            path.push(nextCornerId);
            pathWalls.push(currentWallId);
            visitedWalls.add(currentWallId);
            depth++;

            // 시작점으로 돌아왔는지 확인 (폐곡선)
            if (nextCornerId === startCorner.archiId && path.length >= 4) {
              // 폐곡선 완성
              break;
            }

            // 다음 벽 찾기
            const nextNeighbors = wallGraph[nextCornerId] || [];
            const nextNeighbor = nextNeighbors.find(
              n => {
                // 시작점으로 돌아가는 벽은 허용
                if (n.cornerId === startCorner.archiId && path.length >= 3) {
                  return true;
                }
                // 방문하지 않은 벽만
                return n.wallId !== currentWallId && !visitedWalls.has(n.wallId);
              }
            );

            if (nextNeighbor) {
              currentCornerId = nextCornerId;
              nextCornerId = nextNeighbor.cornerId;
              currentWallId = nextNeighbor.wallId;
            } else {
              break; // 더 이상 연결된 벽이 없음
            }
          }

          // 폐곡선이거나 최소 3개 점 이상인 경로만 추가
          if (path.length >= 4 && path[0] === path[path.length - 1]) {
            // 마지막 중복 코너 제거 (첫 코너와 같으므로)
            const uniqueCorners = path.slice(0, -1); // 마지막 요소 제거
            
            allPaths.push({
              corners: uniqueCorners, // 중복 제거된 코너들
              walls: pathWalls
            });
          }
        });
      });
    };

    findPaths();

    // 3. 각 경로를 BufferGeometry로 직접 생성 (4개 점으로 폐곡선 만들기)
    const geometries = [];

    allPaths.forEach((path, pathIndex) => {
      if (path.corners.length < 3) {
        return;
      }

      // 경로의 코너들을 3D 좌표로 변환
      const pathPoints = path.corners.map(cornerId => {
        const corner = corners.find(c => c.archiId === cornerId);
        if (!corner) {
          return null;
        }
        return createVector3FromLogical(
          { x: corner.position.x, z: corner.position.z, y: 0 },
          THREE
        );
      }).filter(Boolean);

      if (pathPoints.length < 3) {
        return;
      }

      // 폐곡선 처리: 첫 점과 마지막 점이 같으면 제거하고, 고유한 점들만 사용
      const uniquePoints = [];
      for (let i = 0; i < pathPoints.length; i++) {
        // 첫 점과 마지막 점이 같으면 마지막 점 제외
        if (i === pathPoints.length - 1 && pathPoints[i].equals(pathPoints[0])) {
          continue;
        }
        uniquePoints.push(pathPoints[i]);
      }
      
      // 폐곡선 만들기: 첫 점을 마지막에 추가
      if (uniquePoints.length < 3) {
        return;
      }
      uniquePoints.push(uniquePoints[0].clone());

      // BufferGeometry로 직접 생성
      const geometry = createWallBufferGeometry(
        uniquePoints,
        wallHeight,
        wallThickness,
        THREE
      );

      if (geometry) {
        geometries.push(geometry);
      }
    });

    const debugInfo = {
      totalWalls: walls.length,
      totalPaths: allPaths.length,
      paths: allPaths.map(p => {
        // 경로의 코너들을 3D 좌표로 변환
        const pathPoints = p.corners.map(cornerId => {
          const corner = corners.find(c => c.archiId === cornerId);
          if (!corner) return null;
          const vec3 = createVector3FromLogical(
            { x: corner.position.x, z: corner.position.z, y: 0 },
            THREE
          );
          return { x: vec3.x, y: vec3.y, z: vec3.z };
        }).filter(Boolean);

        return {
          cornerCount: p.corners.length,
          wallCount: p.walls.length,
          corners: p.corners.map(cornerId => {
            const corner = corners.find(c => c.archiId === cornerId);
            if (!corner) return { id: cornerId, position: null };
            
            // 논리적 좌표 (원본)
            const logicalPos = corner.position;
            
            // 3D 좌표로 변환
            const coords3D = logicalTo3D({ 
              x: corner.position.x, 
              z: corner.position.z, 
              y: 0 
            });
            
            return {
              id: cornerId,
              position: {
                logical: { x: logicalPos.x, z: logicalPos.z },  // 논리적 단위 (미터)
                world3D: { x: coords3D.x, y: coords3D.y, z: coords3D.z }  // 3D 좌표
              }
            };
          }),
          pathPoints: pathPoints  // 실제 사용된 3D 좌표들
        };
      })
    };

    return { geometries, debugInfo };
  }, [walls, corners]);

  // 룸 중심(대략) 계산: 모든 코너의 평균 (3D)
  const roomCenter = useMemo(() => {
    if (!walls || walls.length === 0 || !corners || corners.length === 0) {
      return new THREE.Vector3(0, 0, 0);
    }
    const center = new THREE.Vector3(0, 0, 0);
    let cnt = 0;
    corners.forEach(c => {
      center.x += c.position.x;
      center.z += c.position.z;
      cnt++;
    });
    if (cnt > 0) {
      center.x /= cnt;
      center.z /= cnt;
    }
    return new THREE.Vector3(center.x, 0, center.z);
  }, [corners, walls]);

  // 박스 지오메트리 기반(직육면체)로 각 벽을 생성
  const wallMeshes = useMemo(() => {
    if (!walls || walls.length === 0 || !corners || corners.length === 0) {
      return [];
    }

    const wallHeight = 10;
    const wallThickness = 0.5;

    return walls.map(wall => {
      const startCorner = corners.find(c => c.archiId === wall.corners[0]);
      const endCorner = corners.find(c => c.archiId === wall.corners[1]);
      if (!startCorner || !endCorner) return null;

      const start = createVector3FromLogical({ x: startCorner.position.x, z: startCorner.position.z, y: 0 }, THREE);
      const end = createVector3FromLogical({ x: endCorner.position.x, z: endCorner.position.z, y: 0 }, THREE);

      const direction = end.clone().sub(start);
      const length = direction.length();
      // Room3D 바닥과 동일한 회전 규칙을 사용 (Z축 부호 반전)
      const angle = Math.atan2(-direction.z, direction.x);

      // 벽 중심
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const position = [mid.x, wallHeight / 2, mid.z];

      // 벽의 법선 (XZ 수직 방향)
      const normal = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
      // 룸 외곽(바깥) 방향 벡터 추정: 벽 중심에서 룸 중심으로 향하는 벡터의 반대
      const toRoomCenter = roomCenter.clone().sub(mid).normalize();
      // normal이 바깥쪽을 향하도록 정규화 (normal · toRoomCenter < 0 -> 바깥쪽)
      const outwardNormal = normal.dot(toRoomCenter) < 0 ? normal.clone() : normal.clone().multiplyScalar(-1);

      return {
        key: wall.archiId,
        geometry: new THREE.BoxGeometry(length, wallHeight, wallThickness),
        position,
        rotation: [0, angle, 0],
        center: mid,
        outwardNormal
      };
    }).filter(Boolean);
  }, [walls, corners]);

  // 카메라 각도에 따라 전면 벽 숨김 (프레임 기반 업데이트)
  useFrame(() => {
    wallMeshes.forEach(({ key, center, outwardNormal }) => {
      const mesh = wallRefs.current[key];
      if (!mesh) return;
      const toCamera = new THREE.Vector3().copy(camera.position).sub(center).normalize();
      // 카메라가 벽의 바깥쪽에 있고, 그 방향이 벽의 outwardNormal과 같은 쪽이면 전면으로 간주
      const isFrontWall = outwardNormal.dot(toCamera) > 0;
      mesh.visible = !isFrontWall;
    });
  });

  const [hoveredWallId, setHoveredWallId] = useState(null);
  const [selectedWallId, setSelectedWallId] = useState(null);

  if (wallMeshes.length === 0) return null;

  return (
    <>
      {wallMeshes.map(({ key, geometry, position, rotation }) => (
        <mesh
          key={key}
          name={`Wall:${key}`}
          userData={{ type: 'wall', id: key }}
          geometry={geometry}
          position={position}
          rotation={rotation}
          ref={(el) => {
            if (el) wallRefs.current[key] = el;
          }}
          castShadow
          receiveShadow
          onPointerOver={(e) => { e.stopPropagation(); setHoveredWallId(key); }}
          onPointerOut={(e) => { e.stopPropagation(); if (hoveredWallId === key) setHoveredWallId(null); }}
          onPointerDown={(e) => { e.stopPropagation(); setSelectedWallId(key); }}
        >
          <meshStandardMaterial
            color={selectedWallId === key ? '#2563eb' : (hoveredWallId === key ? '#4b5563' : '#9ca3af')}
            metalness={0.1}
            roughness={0.9}
          />
        </mesh>
      ))}
    </>
  );
};

export default Walls3D;
