import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { useArchisketch } from '../../context/ArchisketchContext';
import Corner3D from './Corner3D';
import Walls3D from './Walls3D';
import Room3D from './Room3D';

const Interior3D = () => {
  const { corners, walls, rooms } = useArchisketch();

  return (
    <div className="w-full h-full relative">
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