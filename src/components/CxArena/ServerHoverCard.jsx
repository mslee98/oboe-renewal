import React, { useState, useEffect } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";

const ServerHoverCard = ({ position = [0, 0, 0], serverName = "SerRackA_001" }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [status, setStatus] = useState("normal");
  const [cpuUsage, setCpuUsage] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorType, setErrorType] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      // CPU 사용률 시뮬레이션
      const newCpuUsage = Math.random() * 100;
      setCpuUsage(Math.round(newCpuUsage));

      // 메모리 사용률 시뮬레이션
      const newMemoryUsage = Math.random() * 100;
      setMemoryUsage(Math.round(newMemoryUsage));

      // 온도 시뮬레이션 (35-65°C)
      const newTemperature = 35 + Math.random() * 30;
      setTemperature(Math.round(newTemperature));

      // 상태 결정
      if (newCpuUsage > 90 || newMemoryUsage > 90 || newTemperature > 60) {
        setStatus("error");
      } else if (newCpuUsage > 80 || newMemoryUsage > 80 || newTemperature > 50) {
        setStatus("warning");
      } else {
        setStatus("normal");
      }

      // 에러 시뮬레이션 (5% 확률)
      if (Math.random() < 0.05) {
        const errorTypes = [
          "CPU 과부하",
          "메모리 부족", 
          "온도 과열",
          "네트워크 오류",
          "디스크 공간 부족"
        ];
        setErrorType(errorTypes[Math.floor(Math.random() * errorTypes.length)]);
        setHasError(true);
        
        // 3초 후 에러 해제
        setTimeout(() => {
          setHasError(false);
        }, 3000);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch(status) {
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getStatusText = () => {
    switch(status) {
      case 'error': return '오류';
      case 'warning': return '경고';
      default: return '정상';
    }
  };

  return (
    <group position={position}>
      {/* 서버 마커 (작은 구체) */}
      <mesh
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      >
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial 
          color={hasError ? "#ef4444" : status === "warning" ? "#f59e0b" : "#10b981"}
          emissive={hasError ? "#ef4444" : status === "warning" ? "#f59e0b" : "#10b981"}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* 호버 시 나타나는 카드 */}
      {isHovered && (
        <Html position={[0, 0.5, 0]} center>
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200/50 dark:border-gray-600/50 min-w-[200px] max-w-[250px] p-4 transform transition-all duration-300 ease-out">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                {serverName}
              </h3>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
                <span className={`text-xs font-medium ${
                  status === 'error' ? 'text-red-600 dark:text-red-400' : 
                  status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 
                  'text-green-600 dark:text-green-400'
                }`}>
                  {getStatusText()}
                </span>
              </div>
            </div>

            {/* 에러 알림 */}
            {hasError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-red-700 dark:text-red-300">
                    {errorType}
                  </span>
                </div>
              </div>
            )}

            {/* 시스템 정보 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 dark:text-gray-300">CPU 사용률</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        cpuUsage > 80 ? 'bg-red-500' : cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${cpuUsage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200 min-w-[2rem]">
                    {cpuUsage}%
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 dark:text-gray-300">메모리 사용률</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        memoryUsage > 80 ? 'bg-red-500' : memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${memoryUsage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200 min-w-[2rem]">
                    {memoryUsage}%
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 dark:text-gray-300">온도</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        temperature > 55 ? 'bg-red-500' : temperature > 45 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(temperature - 35) / 30 * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200 min-w-[2rem]">
                    {temperature}°C
                  </span>
                </div>
              </div>
            </div>

            {/* 타임스탬프 */}
            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date().toLocaleTimeString('ko-KR')}
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

export default ServerHoverCard; 