import React, { useState, useEffect } from "react";
import AnimatedList from "./AnimatedList";

const NotificationList = () => {
  const [notifications, setNotifications] = useState([]);

  // 알림 메시지 생성 함수
  const generateNotification = () => {
    const types = ['info', 'success', 'warning', 'error'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const messages = {
      info: [
        { title: "시스템 모니터링", message: "CPU 사용률이 정상 범위 내에 있습니다." },
        { title: "네트워크 상태", message: "네트워크 연결이 안정적으로 유지되고 있습니다." },
        { title: "메모리 사용량", message: "메모리 사용량이 예상 범위 내에 있습니다." }
      ],
      success: [
        { title: "백업 완료", message: "시스템 백업이 성공적으로 완료되었습니다." },
        { title: "업데이트 성공", message: "소프트웨어 업데이트가 성공적으로 적용되었습니다." },
        { title: "연결 복구", message: "네트워크 연결이 복구되었습니다." }
      ],
      warning: [
        { title: "CPU 사용률 경고", message: "CPU 사용률이 80%를 초과했습니다." },
        { title: "메모리 부족", message: "메모리 사용량이 85%에 도달했습니다." },
        { title: "네트워크 지연", message: "네트워크 응답 시간이 증가하고 있습니다." }
      ],
      error: [
        { title: "시스템 오류", message: "임계값을 초과하는 시스템 오류가 발생했습니다." },
        { title: "연결 실패", message: "네트워크 연결에 문제가 발생했습니다." },
        { title: "서비스 중단", message: "일부 서비스가 일시적으로 중단되었습니다." }
      ]
    };

    const messagePool = messages[type];
    const randomMessage = messagePool[Math.floor(Math.random() * messagePool.length)];
    
    return {
      id: Date.now() + Math.random(),
      type,
      title: randomMessage.title,
      message: randomMessage.message,
      timestamp: new Date().toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      })
    };
  };

  useEffect(() => {
    // 초기 알림 생성
    const initialNotifications = Array.from({ length: 3 }, () => generateNotification());
    setNotifications(initialNotifications);

    // 주기적으로 새로운 알림 추가
    const interval = setInterval(() => {
      setNotifications(prev => {
        const newNotification = generateNotification();
        return [newNotification, ...prev.slice(0, 4)]; // 최대 5개 유지
      });
    }, 3000); // 3초마다 새로운 알림

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">실시간 알림</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
          {notifications.length}개
        </span>
      </div>
      <AnimatedList items={notifications} maxItems={5} />
    </div>
  );
};

export default NotificationList; 