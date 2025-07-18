import React, { useState, useEffect } from "react";
import { Html } from "@react-three/drei";

const ServerStatusIndicator = ({ position = [0, 0, 0], serverName = "SerRackA_001" }) => {
  const [status, setStatus] = useState("normal");
  const [cpuUsage, setCpuUsage] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [temperature, setTemperature] = useState(0);

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
      {/* 서버 상태 표시 */}
      <Html 
        position={[0, 0.5, 0]} 
        center
        style={{
          zIndex: 1000,
          pointerEvents: 'none' // 마우스 이벤트 방지
        }}
      >
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-gray-200/50 dark:border-gray-600/50 min-w-[120px] max-w-[140px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
              {serverName}
            </span>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor()}`}></div>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
            <div className="flex justify-between">
              <span>CPU:</span>
              <span className="font-medium">{cpuUsage}%</span>
            </div>
            <div className="flex justify-between">
              <span>메모리:</span>
              <span className="font-medium">{memoryUsage}%</span>
            </div>
            <div className="flex justify-between">
              <span>온도:</span>
              <span className="font-medium">{temperature}°C</span>
            </div>
          </div>
          <div className="text-xs font-medium mt-1 text-center">
            <span className={status === 'error' ? 'text-red-600 dark:text-red-400' : 
                           status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 
                           'text-green-600 dark:text-green-400'}>
              {getStatusText()}
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
};

export default ServerStatusIndicator; 