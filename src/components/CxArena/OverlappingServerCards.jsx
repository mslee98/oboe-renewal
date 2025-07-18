import React, { useState, useEffect } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";

const OverlappingServerCards = ({ position = [0, 0, 0], servers = [] }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);

  // 서버 데이터 시뮬레이션
  const [serverData, setServerData] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      const newData = {};
      
      servers.forEach(serverName => {
        const cpuUsage = Math.round(Math.random() * 100);
        const memoryUsage = Math.round(Math.random() * 100);
        const temperature = Math.round(35 + Math.random() * 30);
        
        let status = "normal";
        if (cpuUsage > 90 || memoryUsage > 90 || temperature > 60) {
          status = "error";
        } else if (cpuUsage > 80 || memoryUsage > 80 || temperature > 50) {
          status = "warning";
        }

        newData[serverName] = {
          cpuUsage,
          memoryUsage,
          temperature,
          status,
          hasError: Math.random() < 0.05
        };
      });
      
      setServerData(newData);
    }, 2000);

    return () => clearInterval(interval);
  }, [servers]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'error': return '오류';
      case 'warning': return '경고';
      default: return '정상';
    }
  };

  return (
    <group position={position}>
      {/* 겹친 서버 마커들 */}
      <mesh
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => {
          setIsHovered(false);
          setExpandedIndex(null);
        }}
      >
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial 
          color="#6366f1"
          emissive="#6366f1"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* 호버 시 나타나는 겹친 카드들 */}
      {isHovered && (
        <Html position={[0, 0.5, 0]} center>
          <div className="relative">
            {/* 겹친 카드들 */}
            <div className="flex items-center gap-1">
              {servers.map((serverName, index) => {
                const data = serverData[serverName];
                if (!data) return null;

                const isExpanded = expandedIndex === index;
                
                return (
                  <div
                    key={serverName}
                    className={`relative transition-all duration-300 ease-out ${
                      isExpanded ? 'z-20' : 'z-10'
                    }`}
                    onMouseEnter={() => setExpandedIndex(index)}
                    onMouseLeave={() => setExpandedIndex(null)}
                  >
                    {/* 기본 카드 (축소된 상태) */}
                    <div className={`
                      bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg 
                      border border-gray-200/50 dark:border-gray-600/50 
                      p-2 min-w-[120px] max-w-[140px]
                      transition-all duration-300 ease-out
                      ${isExpanded ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
                    `}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                          {serverName}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(data.status)}`}></div>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                        <div className="flex justify-between">
                          <span>CPU:</span>
                          <span className="font-medium">{data.cpuUsage}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>메모리:</span>
                          <span className="font-medium">{data.memoryUsage}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>온도:</span>
                          <span className="font-medium">{data.temperature}°C</span>
                        </div>
                      </div>
                    </div>

                    {/* 확장된 카드 */}
                    <div className={`
                      absolute top-0 left-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm 
                      rounded-lg shadow-xl border border-gray-200/50 dark:border-gray-600/50 
                      p-4 min-w-[220px] max-w-[280px]
                      transition-all duration-300 ease-out
                      ${isExpanded ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
                    `}>
                      {/* 헤더 */}
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                          {serverName}
                        </h3>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(data.status)}`}></div>
                          <span className={`text-xs font-medium ${
                            data.status === 'error' ? 'text-red-600 dark:text-red-400' : 
                            data.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 
                            'text-green-600 dark:text-green-400'
                          }`}>
                            {getStatusText(data.status)}
                          </span>
                        </div>
                      </div>

                      {/* 에러 알림 */}
                      {data.hasError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-2 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium text-red-700 dark:text-red-300">
                              시스템 오류 발생
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 상세 시스템 정보 */}
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-600 dark:text-gray-300">CPU 사용률</span>
                            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                              {data.cpuUsage}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                data.cpuUsage > 80 ? 'bg-red-500' : data.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${data.cpuUsage}%` }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-600 dark:text-gray-300">메모리 사용률</span>
                            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                              {data.memoryUsage}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                data.memoryUsage > 80 ? 'bg-red-500' : data.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${data.memoryUsage}%` }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-600 dark:text-gray-300">온도</span>
                            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                              {data.temperature}°C
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                data.temperature > 55 ? 'bg-red-500' : data.temperature > 45 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${(data.temperature - 35) / 30 * 100}%` }}
                            ></div>
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
                  </div>
                );
              })}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

export default OverlappingServerCards; 