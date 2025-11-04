import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { useArchisketch } from '../../context/ArchisketchContext';
import { useScene } from '../../context/SceneContext';
import Corner3D from './Corner3D';
import Walls3D from './Walls3D';
import Room3D from './Room3D';
import * as THREE from 'three';

// 씬 그래프를 업데이트하는 컴포넌트
const SceneGraphUpdater = ({ corners, walls, rooms }) => {
  const { scene } = useThree();
  const { updateSceneData } = useScene();
  const hasInitializedRef = useRef(false);

  // 노드 타입 판별 함수
  const getNodeType = (node) => {
    if (node.isScene) return 'scene';
    if (node.isGroup) return 'collection';
    if (node.isMesh) return 'mesh';
    if (node.isLight) return 'light';
    if (node.isCamera) return 'camera';
    if (node.isObject3D) return 'object';
    // floorPlan 요소들
    if (node.userData?.type === 'room') return 'room';
    if (node.userData?.type === 'wall') return 'wall';
    if (node.userData?.type === 'corner') return 'corner';
    return 'unknown';
  };

  useEffect(() => {
    if (!scene) return;

    // 씬이 준비되면 씬 그래프 데이터 생성
    const updateSceneGraph = () => {
      const convertSceneToGraphData = (scene) => {
        if (!scene) return [];
        
        const convertNode = (node) => {
          // 조명, 카메라, 그리드는 제외
          if (node.isLight || node.isCamera || node.name === 'Grid') {
            return null;
          }

          const graphNode = {
            id: node.uuid,
            name: node.name || node.userData?.name || 'Unnamed',
            type: getNodeType(node),
            visible: node.visible !== false,
            renderable: true,
            hasModifiers: !!(node.geometry || node.material || node.userData),
            children: []
          };

          if (node.children && node.children.length > 0) {
            const childNodes = node.children
              .map(convertNode)
              .filter(Boolean); // null 제거
            graphNode.children = childNodes;
          }

          return graphNode;
        };

        return [convertNode(scene)];
      };

      const sceneData = convertSceneToGraphData(scene);
      updateSceneData(sceneData, scene);
    };

    // 초기화는 한 번만
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      // 씬이 완전히 로드될 때까지 대기
      setTimeout(updateSceneGraph, 100);
    } else {
      // 이후에는 씬이 변경될 때마다 업데이트
      updateSceneGraph();
    }
  }, [scene, corners, walls, rooms, updateSceneData]);

  return null;
};

const Interior3D = () => {
  const { corners, walls, rooms } = useArchisketch();

  return (
    <div className="w-full h-full relative overflow-hidden">
      <Canvas
        shadows
        camera={{
          position: [30, 30, 30], // 더 가까운 위치에서 시작
          fov: 60,
          near: 0.1,
          far: 5000
        }}
        style={{ background: 'linear-gradient(to bottom, #e5f3ff 0%, #f8fafc 100%)' }}
      >
        <Suspense fallback={null}>
          {/* 씬 그래프 업데이터 */}
          <SceneGraphUpdater corners={corners} walls={walls} rooms={rooms} />
          
          {/* 조명 */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[50, 100, 50]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          
          {/* 그리드 바닥 */}
          <Grid
            position={[0, -1, 0]}
            args={[200, 200]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#e2e8f0"
            sectionSize={10}
            sectionThickness={1}
            sectionColor="#cbd5e1"
            fadeDistance={100}
            fadeStrength={1}
          />

          {/* 룸들 렌더링 */}
          {rooms.map(room => {
            const roomCorners = room.corners.map(cornerId => 
              corners.find(c => c.archiId === cornerId)
            ).filter(Boolean);
            
            return (
              <Room3D 
                key={room.archiId} 
                room={room} 
                corners={corners}
              />
            );
          })}

          {/* 벽들 렌더링 - 모든 코너를 연결한 경로를 따라 돌출 */}
          <Walls3D walls={walls} corners={corners} />

          {/* 코너들 렌더링 (구체 제거) */}
          {/* {corners.map(corner => (
            <Corner3D key={corner.archiId} corner={corner} />
          ))} */}

          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            maxPolarAngle={Math.PI / 2.2}
            minDistance={5}
            maxDistance={200}
          />
        </Suspense>
      </Canvas>

      {/* 3D 컨트롤 가이드 */}
      <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-800/90 rounded-lg p-3 shadow-lg">
        <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          3D 뷰 컨트롤
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div>• 드래그: 회전</div>
          <div>• 휠: 줌</div>
          <div>• 우클릭: 팬</div>
        </div>
      </div>

      {/* 통계 */}
      <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 rounded-lg p-3 shadow-lg">
        <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          건축 요소
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div>코너: {corners.length}개</div>
          <div>벽: {walls.length}개</div>
          <div>방: {rooms.length}개</div>
        </div>
      </div>
    </div>
  );
};

export default Interior3D; 