import React, { useState, useEffect } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";

const ErrorAlertMarker = ({ position = [0, 0, 0], serverName = "SerRackA_001", errorType = "시스템 오류" }) => {
  const [pulseScale, setPulseScale] = useState(1);

  // 펄싱 애니메이션
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseScale(prev => prev === 1 ? 1.2 : 1);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <group position={position}>
      {/* 빨간색 경고 구체 */}
      <mesh scale={[pulseScale, pulseScale, pulseScale]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial 
          color="#ef4444" 
          emissive="#ef4444"
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* 경고 아이콘 */}
      <Html position={[0, 0.5, 0]} center>
        <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold whitespace-nowrap animate-pulse">
          ⚠️ 경고
        </div>
      </Html>

      {/* 에러 정보 팝업 */}
      <Html position={[0, 1.5, 0]} center>
        <div className="bg-red-600/90 backdrop-blur-sm text-white p-3 rounded-lg shadow-lg border border-red-400/50 max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            <span className="font-bold text-sm">서버 오류</span>
          </div>
          <div className="text-xs">
            <div className="font-semibold mb-1">{serverName}</div>
            <div className="text-red-200">{errorType}</div>
            <div className="text-red-300 mt-2 text-xs">
              {new Date().toLocaleTimeString('ko-KR')}
            </div>
          </div>
        </div>
      </Html>

      {/* 경고선 (서버까지 연결) */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 0, -2, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ef4444" linewidth={2} />
      </lineSegments>
    </group>
  );
};

export default ErrorAlertMarker; 