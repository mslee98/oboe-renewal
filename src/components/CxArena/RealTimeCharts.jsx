import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area, BarChart, Bar } from "recharts";

const generateServerData = (baseValue, variance = 0.1) => {
  return Math.max(0, Math.min(100, baseValue + (Math.random() - 0.5) * variance));
};

const RealTimeCharts = () => {
  const [serverData, setServerData] = useState([]);
  const [serverStatus, setServerStatus] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const time = now.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });

      // 서버별 실시간 데이터 생성
      const newServerData = {
        time,
        server1_cpu: generateServerData(65, 20),
        server1_memory: generateServerData(70, 15),
        server1_temp: generateServerData(45, 10),
        server1_network: generateServerData(60, 25),
        server2_cpu: generateServerData(55, 18),
        server2_memory: generateServerData(65, 12),
        server2_temp: generateServerData(42, 8),
        server2_network: generateServerData(50, 20),
        server3_cpu: generateServerData(75, 22),
        server3_memory: generateServerData(80, 18),
        server3_temp: generateServerData(48, 12),
        server3_network: generateServerData(70, 30),
      };

      setServerData(prev => {
        const updated = [...prev, newServerData];
        return updated.length > 15 ? updated.slice(-15) : updated;
      });

      // 서버 상태 업데이트
      setServerStatus({
        server1: {
          status: newServerData.server1_cpu > 80 ? 'warning' : newServerData.server1_cpu > 90 ? 'error' : 'normal',
          cpu: Math.round(newServerData.server1_cpu),
          memory: Math.round(newServerData.server1_memory),
          temp: Math.round(newServerData.server1_temp),
          network: Math.round(newServerData.server1_network)
        },
        server2: {
          status: newServerData.server2_cpu > 80 ? 'warning' : newServerData.server2_cpu > 90 ? 'error' : 'normal',
          cpu: Math.round(newServerData.server2_cpu),
          memory: Math.round(newServerData.server2_memory),
          temp: Math.round(newServerData.server2_temp),
          network: Math.round(newServerData.server2_network)
        },
        server3: {
          status: newServerData.server3_cpu > 80 ? 'warning' : newServerData.server3_cpu > 90 ? 'error' : 'normal',
          cpu: Math.round(newServerData.server3_cpu),
          memory: Math.round(newServerData.server3_memory),
          temp: Math.round(newServerData.server3_temp),
          network: Math.round(newServerData.server3_network)
        }
      });
    }, 2000); // 2초마다 업데이트

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'error': return 'text-red-500 dark:text-red-400';
      case 'warning': return 'text-yellow-500 dark:text-yellow-400';
      default: return 'text-green-500 dark:text-green-400';
    }
  };

  const getStatusBgColor = (status) => {
    switch(status) {
      case 'error': return 'bg-red-100 dark:bg-red-900/30';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/30';
      default: return 'bg-green-100 dark:bg-green-900/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* 서버 상태 대시보드 */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-4 border border-gray-200/50 dark:border-gray-600/50">
        <h3 className="font-bold mb-3 text-gray-800 dark:text-gray-200">서버실 모니터링 대시보드</h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(serverStatus).map(([serverName, data]) => (
            <div key={serverName} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
                  {serverName.replace('server', '서버 ')}
                </h4>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBgColor(data.status)} ${getStatusColor(data.status)}`}>
                  {data.status === 'normal' ? '정상' : data.status === 'warning' ? '경고' : '오류'}
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">CPU:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{data.cpu}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">메모리:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{data.memory}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">온도:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{data.temp}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">네트워크:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{data.network}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CPU 사용률 차트 */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-4 border border-gray-200/50 dark:border-gray-600/50">
        <h3 className="font-bold mb-2 text-gray-800 dark:text-gray-200">CPU 사용률 모니터링</h3>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={serverData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="time" 
              stroke="#9CA3AF"
              className="dark:text-gray-400"
            />
            <YAxis 
              domain={[0, 100]} 
              stroke="#9CA3AF"
              className="dark:text-gray-400"
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
              }}
            />
            <Legend 
              wrapperStyle={{
                color: '#F9FAFB'
              }}
            />
            <Line type="monotone" dataKey="server1_cpu" stroke="#8884d8" name="서버 1 CPU" dot={false} />
            <Line type="monotone" dataKey="server2_cpu" stroke="#82ca9d" name="서버 2 CPU" dot={false} />
            <Line type="monotone" dataKey="server3_cpu" stroke="#ffc658" name="서버 3 CPU" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 메모리 사용률 차트 */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-4 border border-gray-200/50 dark:border-gray-600/50">
        <h3 className="font-bold mb-2 text-gray-800 dark:text-gray-200">메모리 사용률 모니터링</h3>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={serverData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="time" 
              stroke="#9CA3AF"
              className="dark:text-gray-400"
            />
            <YAxis 
              domain={[0, 100]} 
              stroke="#9CA3AF"
              className="dark:text-gray-400"
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
              }}
            />
            <Legend 
              wrapperStyle={{
                color: '#F9FAFB'
              }}
            />
            <Area type="monotone" dataKey="server1_memory" stackId="1" stroke="#8884d8" fill="#8884d8" name="서버 1 메모리" />
            <Area type="monotone" dataKey="server2_memory" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="서버 2 메모리" />
            <Area type="monotone" dataKey="server3_memory" stackId="1" stroke="#ffc658" fill="#ffc658" name="서버 3 메모리" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 온도 모니터링 차트 */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-4 border border-gray-200/50 dark:border-gray-600/50">
        <h3 className="font-bold mb-2 text-gray-800 dark:text-gray-200">서버 온도 모니터링</h3>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={serverData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="time" 
              stroke="#9CA3AF"
              className="dark:text-gray-400"
            />
            <YAxis 
              domain={[0, 60]} 
              stroke="#9CA3AF"
              className="dark:text-gray-400"
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
              }}
            />
            <Legend 
              wrapperStyle={{
                color: '#F9FAFB'
              }}
            />
            <Bar dataKey="server1_temp" fill="#8884d8" name="서버 1 온도" />
            <Bar dataKey="server2_temp" fill="#82ca9d" name="서버 2 온도" />
            <Bar dataKey="server3_temp" fill="#ffc658" name="서버 3 온도" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RealTimeCharts; 