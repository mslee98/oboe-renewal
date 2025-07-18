import React, { useState, useEffect } from "react";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";

const ServerMonitoringDashboard = ({ serverPositions = {} }) => {
  const [serverData, setServerData] = useState({});
  const [selectedServer, setSelectedServer] = useState(null);

  // 서버 데이터 시뮬레이션
  useEffect(() => {
    const servers = [
      "SerRackA_001", "SerRackA_002", "SerRackA_003",
      "SerRackB_001", "SerRackB_002", "SerRackB_003",
      "SerRackC_001", "SerRackC_002"
    ];

    const interval = setInterval(() => {
      const newData = {};
      
      servers.forEach(serverName => {
        const cpuUsage = Math.round(Math.random() * 100);
        const memoryUsage = Math.round(Math.random() * 100);
        const temperature = Math.round(35 + Math.random() * 30);
        const networkUsage = Math.round(Math.random() * 100);
        
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
          networkUsage,
          status,
          hasError: Math.random() < 0.05,
          lastUpdate: new Date()
        };
      });
      
      setServerData(newData);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

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

  const getStatusTextColor = (status) => {
    switch(status) {
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-green-600 dark:text-green-400';
    }
  };

  return (
    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200/50 dark:border-gray-600/50 p-4 min-w-[320px] max-w-[400px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">서버실 모니터링</h2>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {new Date().toLocaleTimeString('ko-KR')}
        </div>
      </div>

      {/* 전체 통계 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
            {Object.keys(serverData).length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">총 서버</div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {Object.values(serverData).filter(d => d.status === 'normal').length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">정상</div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-lg font-bold text-red-600 dark:text-red-400">
            {Object.values(serverData).filter(d => d.status === 'error').length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">오류</div>
        </div>
      </div>

      {/* 서버 목록 */}
      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
        {Object.entries(serverData).map(([serverName, data]) => (
          <div
            key={serverName}
            className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
              selectedServer === serverName 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-200 dark:border-gray-600'
            }`}
            onClick={() => setSelectedServer(selectedServer === serverName ? null : serverName)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {serverName}
              </span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(data.status)}`}></div>
                <span className={`text-xs font-medium ${getStatusTextColor(data.status)}`}>
                  {getStatusText(data.status)}
                </span>
              </div>
            </div>
            
            {/* 간단한 상태 표시 */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="text-center">
                <div className="text-gray-600 dark:text-gray-300">CPU</div>
                <div className="font-medium text-gray-800 dark:text-gray-200">{data.cpuUsage}%</div>
              </div>
              <div className="text-center">
                <div className="text-gray-600 dark:text-gray-300">메모리</div>
                <div className="font-medium text-gray-800 dark:text-gray-200">{data.memoryUsage}%</div>
              </div>
              <div className="text-center">
                <div className="text-gray-600 dark:text-gray-300">온도</div>
                <div className="font-medium text-gray-800 dark:text-gray-200">{data.temperature}°C</div>
              </div>
              <div className="text-center">
                <div className="text-gray-600 dark:text-gray-300">네트워크</div>
                <div className="font-medium text-gray-800 dark:text-gray-200">{data.networkUsage}%</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 선택된 서버 상세 정보 */}
      {selectedServer && serverData[selectedServer] && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3">
            {selectedServer} 상세 정보
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-300">CPU 사용률</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {serverData[selectedServer].cpuUsage}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    serverData[selectedServer].cpuUsage > 80 ? 'bg-red-500' : 
                    serverData[selectedServer].cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${serverData[selectedServer].cpuUsage}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-300">메모리 사용률</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {serverData[selectedServer].memoryUsage}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    serverData[selectedServer].memoryUsage > 80 ? 'bg-red-500' : 
                    serverData[selectedServer].memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${serverData[selectedServer].memoryUsage}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-300">온도</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {serverData[selectedServer].temperature}°C
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    serverData[selectedServer].temperature > 55 ? 'bg-red-500' : 
                    serverData[selectedServer].temperature > 45 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${(serverData[selectedServer].temperature - 35) / 30 * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-300">네트워크 사용률</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {serverData[selectedServer].networkUsage}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    serverData[selectedServer].networkUsage > 80 ? 'bg-red-500' : 
                    serverData[selectedServer].networkUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${serverData[selectedServer].networkUsage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerMonitoringDashboard; 