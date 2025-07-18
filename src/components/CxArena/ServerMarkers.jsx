import React, { useState, useEffect, useRef } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";

const ServerMarkers = ({ modelScene }) => {
  const [serverPositions, setServerPositions] = useState({});
  const [errorServers, setErrorServers] = useState({});
  const [resolvedErrors, setResolvedErrors] = useState({});
  const hasInitializedRef = useRef(false);

  // modelScene에서 SerRack 객체들을 찾아서 위치 정보를 추출
  useEffect(() => {
    if (modelScene && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      
      const findServerPositions = (node) => {
        const positions = {};
        
        const traverse = (currentNode) => {
          // SerRack으로 시작하는 이름의 객체 찾기
          if (currentNode.name && currentNode.name.includes('SerRack')) {
            const worldPosition = new THREE.Vector3();
            currentNode.getWorldPosition(worldPosition);
            positions[currentNode.name] = worldPosition;
          }
          
          // 자식 노드들도 탐색
          currentNode.children.forEach(child => traverse(child));
        };
        
        traverse(node);
        return positions;
      };
      
      const positions = findServerPositions(modelScene);
      setServerPositions(positions);
      
      console.log('Found server positions:', positions);
    }
  }, [modelScene]);

  // 에러 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      const newErrors = {};
      
      Object.keys(serverPositions).forEach(serverName => {
        // 10% 확률로 에러 발생
        if (Math.random() < 0.1) {
          const errorTypes = [
            "CPU 과부하",
            "메모리 부족", 
            "온도 과열",
            "네트워크 오류",
            "디스크 공간 부족"
          ];
          newErrors[serverName] = {
            type: errorTypes[Math.floor(Math.random() * errorTypes.length)],
            timestamp: new Date().toLocaleTimeString(),
            severity: Math.random() > 0.5 ? "critical" : "warning"
          };
        }
      });
      
      setErrorServers(newErrors);
    }, 5000);

    return () => clearInterval(interval);
  }, [serverPositions]);

  // 즉시 조치 함수
  const handleImmediateAction = (serverName) => {
    console.log(`즉시 조치 실행: ${serverName}`);
    
    // 에러 해결 처리
    setResolvedErrors(prev => ({
      ...prev,
      [serverName]: {
        resolvedAt: new Date().toLocaleTimeString(),
        action: "자동 복구 실행"
      }
    }));
    
    // 3초 후 에러 상태 제거
    setTimeout(() => {
      setErrorServers(prev => {
        const newErrors = { ...prev };
        delete newErrors[serverName];
        return newErrors;
      });
      
      setResolvedErrors(prev => {
        const newResolved = { ...prev };
        delete newResolved[serverName];
        return newResolved;
      });
    }, 3000);
  };

  // 무시 함수
  const handleIgnore = (serverName) => {
    console.log(`에러 무시: ${serverName}`);
    setErrorServers(prev => {
      const newErrors = { ...prev };
      delete newErrors[serverName];
      return newErrors;
    });
  };

  return (
    <>
      {Object.entries(serverPositions).map(([serverName, position]) => {
        const hasError = errorServers[serverName];
        const isResolved = resolvedErrors[serverName];
        const [x, y, z] = position;
        
        return (
          <group key={serverName} position={position}>
            {/* 에러가 있을 때만 팝업 표시 */}
            {hasError && (
              <Html position={[x, y + 3.5, z]} center>
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-red-200/50 dark:border-red-700/50 p-4 min-w-[280px] max-w-[320px]">
                  {/* 헤더 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="font-bold text-red-600 dark:text-red-400 text-sm">
                        서버 오류 알림
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date().toLocaleTimeString('ko-KR')}
                    </div>
                  </div>

                  {/* 서버 정보 */}
                  <div className="mb-3">
                    <div className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-1">
                      {serverName}
                    </div>
                    <div className="text-red-600 dark:text-red-400 text-sm font-medium">
                      {hasError.type}
                    </div>
                  </div>

                  {/* 상태 표시 */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                      <div className="text-xs text-red-600 dark:text-red-400 font-medium">상태</div>
                      <div className="text-xs text-red-700 dark:text-red-300">긴급</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                      <div className="text-xs text-red-600 dark:text-red-400 font-medium">우선순위</div>
                      <div className="text-xs text-red-700 dark:text-red-300">높음</div>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleImmediateAction(serverName)}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors"
                    >
                      즉시 조치
                    </button>
                    <button 
                      onClick={() => handleIgnore(serverName)}
                      className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium py-2 px-3 rounded-lg transition-colors"
                    >
                      무시
                    </button>
                  </div>
                </div>
              </Html>
            )}
            
            {/* 해결 중일 때 성공 메시지 */}
            {isResolved && (
              <Html position={[x, y + 3.5, z]} center>
                <div className="bg-green-500/95 dark:bg-green-600/95 backdrop-blur-sm text-white px-4 py-3 rounded-xl shadow-2xl border border-green-400/50 dark:border-green-500/50 min-w-[250px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                    <span className="font-semibold text-sm">{serverName}</span>
                  </div>
                  <div className="text-sm mb-1">문제 해결 완료</div>
                  <div className="text-xs opacity-90">{isResolved.action}</div>
                  <div className="text-xs opacity-70 mt-1">{isResolved.resolvedAt}</div>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </>
  );
};

export default ServerMarkers; 