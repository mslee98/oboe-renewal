import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { logicalTo3D } from '../../utils/coordinateUtils';

const Corner3D = ({ corner }) => {
  const meshRef = useRef();

  // 논리적 단위를 3D로 변환 (변환 없음, 그대로 사용)
  const coords3D = logicalTo3D({ x: corner.position.x, z: corner.position.z, y: 5 });
  const position = [
    coords3D.x,
    coords3D.y, // 벽 중간 높이와 일치 (벽 높이 10의 절반)
    coords3D.z
  ];

  useFrame((state) => {
    if (meshRef.current) {
      // 부드러운 회전 애니메이션
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshStandardMaterial 
        color="#fbbf24"
        metalness={0.3}
        roughness={0.7}
      />
    </mesh>
  );
};

export default Corner3D;
