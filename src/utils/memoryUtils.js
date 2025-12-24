/**
 * 브라우저 메모리 사용량 측정 유틸리티
 * Chrome/Edge에서만 지원 (window.performance.memory)
 */

/**
 * 현재 JavaScript 힙 메모리 사용량을 반환
 * @returns {Object|null} 메모리 정보 객체 또는 null (지원하지 않는 브라우저)
 */
export const getMemoryUsage = () => {
  if (typeof window === 'undefined' || !window.performance || !window.performance.memory) {
    console.warn('Memory API is not supported in this browser');
    return null;
  }

  const memory = window.performance.memory;
  
  return {
    usedJSHeapSize: memory.usedJSHeapSize,        // 현재 사용 중인 힙 크기 (bytes)
    totalJSHeapSize: memory.totalJSHeapSize,      // 할당된 총 힙 크기 (bytes)
    jsHeapSizeLimit: memory.jsHeapSizeLimit,      // 힙 크기 제한 (bytes)
    usedMB: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2),      // MB 단위
    totalMB: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2),    // MB 단위
    limitMB: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2),   // MB 단위
    usagePercent: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2) // 사용률 %
  };
};

/**
 * 메모리 사용량을 콘솔에 출력
 */
export const logMemoryUsage = () => {
  const memory = getMemoryUsage();
  if (memory) {
    console.log('📊 Memory Usage:', {
      'Used': `${memory.usedMB} MB`,
      'Total': `${memory.totalMB} MB`,
      'Limit': `${memory.limitMB} MB`,
      'Usage': `${memory.usagePercent}%`
    });
  }
  return memory;
};

/**
 * 메모리 사용량을 주기적으로 모니터링
 * @param {number} intervalMs - 모니터링 간격 (밀리초)
 * @param {Function} callback - 메모리 정보를 받을 콜백 함수
 * @returns {Function} 모니터링을 중지하는 함수
 */
export const monitorMemory = (intervalMs = 1000, callback = null) => {
  if (typeof window === 'undefined' || !window.performance || !window.performance.memory) {
    console.warn('Memory API is not supported in this browser');
    return () => {};
  }

  const intervalId = setInterval(() => {
    const memory = getMemoryUsage();
    if (memory) {
      if (callback) {
        callback(memory);
      } else {
        logMemoryUsage();
      }
    }
  }, intervalMs);

  // 중지 함수 반환
  return () => clearInterval(intervalId);
};

/**
 * 메모리 사용량 변화를 추적 (Before/After 비교용)
 * @returns {Function} 메모리 스냅샷을 찍는 함수
 */
export const createMemorySnapshot = () => {
  const initialMemory = getMemoryUsage();
  
  return {
    initial: initialMemory,
    current: () => getMemoryUsage(),
    diff: () => {
      const current = getMemoryUsage();
      if (!initialMemory || !current) return null;
      
      return {
        usedDiffMB: (current.usedJSHeapSize - initialMemory.usedJSHeapSize) / 1024 / 1024,
        totalDiffMB: (current.totalJSHeapSize - initialMemory.totalJSHeapSize) / 1024 / 1024,
        usageDiffPercent: parseFloat(current.usagePercent) - parseFloat(initialMemory.usagePercent)
      };
    }
  };
};


