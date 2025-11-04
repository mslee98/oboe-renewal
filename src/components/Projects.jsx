import React, { useState, useEffect } from 'react';

const Projects = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);

  // 프로젝트 데이터
  const projects = [
    {
      id: 'strategy',
      title: 'STRATEGY',
      symbol: 'S',
      color: 'from-blue-600 to-purple-600',
      items: [
        'Experience Strategy',
        'Technology Strategy', 
        'Creative Direction',
        'Discovery',
        'Research'
      ]
    },
    {
      id: 'creative',
      title: 'CREATIVE',
      symbol: 'C',
      color: 'from-purple-600 to-pink-600',
      items: [
        'Art Direction',
        'UX/UI Design',
        'Motion Design',
        'Game Design',
        'Illustration'
      ]
    },
    {
      id: 'tech',
      title: 'TECH',
      symbol: 'T',
      color: 'from-pink-600 to-red-600',
      items: [
        'WebGL Development',
        'Web Development',
        'Unity/Unreal',
        'Interactive Installations',
        'VR/AR'
      ]
    },
    {
      id: 'production',
      title: 'PRODUCTION',
      symbol: 'P',
      color: 'from-red-600 to-orange-600',
      items: [
        'Procedural Modeling',
        '3D Asset Creation',
        '3D Asset Optimization',
        'Animation',
        '3D Pipeline'
      ]
    }
  ];

  const handleStackClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleCardHover = (cardId) => {
    setHoveredCard(cardId);
  };

  const handleCardLeave = () => {
    setHoveredCard(null);
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 flex items-center justify-center p-8">
      <div className="max-w-7xl mx-auto">
        {/* 섹션 제목 */}
        <div className="text-center mb-16">
          <h2 className="text-6xl font-bold text-white mb-4">EXPERTISE</h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            우리의 전문 분야를 카드로 확인해보세요
          </p>
        </div>

        {/* 카드 컨테이너 */}
        <div className="relative flex items-center justify-center">
          <div 
            className={`relative transition-all duration-1000 ease-in-out cursor-pointer ${
              isExpanded ? 'w-full' : 'w-80 h-96'
            }`}
            onClick={handleStackClick}
          >
            {projects.map((project, index) => (
              <div
                key={project.id}
                className={`absolute transition-all duration-1000 ease-in-out transform-gpu ${
                  hoveredCard === project.id ? 'z-50' : `z-${40 - index * 10}`
                }`}
                style={{
                  transform: isExpanded 
                    ? `translateX(${index * 320 - 480}px) translateY(0px) rotate(0deg) ${hoveredCard === project.id ? 'scale(1.05) translateY(-16px)' : ''}`
                    : `translateX(${index * 4}px) translateY(${index * 4}px) rotate(${index * 2}deg)`,
                  zIndex: hoveredCard === project.id ? 50 : 40 - index * 10
                }}
                onMouseEnter={() => isExpanded && handleCardHover(project.id)}
                onMouseLeave={handleCardLeave}
              >
                {/* 카드 */}
                <div 
                  className="relative w-80 h-96 preserve-3d transition-transform duration-700 ease-in-out"
                  style={{
                    transform: hoveredCard === project.id ? 'rotateY(180deg)' : 'rotateY(0deg)'
                  }}
                >
                  {/* 카드 앞면 */}
                  <div className={`absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br ${project.color} 
                    shadow-2xl border-4 border-white/20 backface-hidden
                    flex flex-col items-center justify-center text-white p-8`}>
                    
                    {/* 장식적인 패턴 */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-4 left-4 w-16 h-16 border-2 border-white rounded-full"></div>
                      <div className="absolute top-8 right-8 w-8 h-8 border-2 border-white rotate-45"></div>
                      <div className="absolute bottom-8 left-8 w-12 h-12 border-2 border-white rotate-12"></div>
                      <div className="absolute bottom-4 right-4 w-20 h-20 border-2 border-white rounded-full"></div>
                    </div>

                    {/* 메인 심볼 */}
                    <div className="relative z-10 mb-8">
                      <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center mb-4">
                        <span className="text-6xl font-bold">{project.symbol}</span>
                      </div>
                    </div>

                    {/* 제목 */}
                    <h3 className="text-3xl font-bold mb-4 text-center">{project.title}</h3>
                    
                    {/* 하단 장식 */}
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                      <div className="flex space-x-2">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="w-2 h-2 bg-white/40 rounded-full"></div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 카드 뒷면 */}
                  <div className="absolute inset-0 w-full h-full rounded-2xl bg-white 
                    shadow-2xl border-4 border-gray-200 backface-hidden rotate-y-180
                    flex flex-col p-8 text-gray-800">
                    
                    {/* 뒷면 헤더 */}
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-bold text-gray-800">{project.title}</h3>
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${project.color} 
                        flex items-center justify-center text-white font-bold text-xl`}>
                        {project.symbol}
                      </div>
                    </div>

                    {/* 서비스 목록 */}
                    <div className="flex-1">
                      <ul className="space-y-4">
                        {project.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                            <span className="text-gray-700 font-medium">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 하단 로고 */}
                    <div className="flex justify-center mt-6">
                      <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                        {project.title}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 인터랙션 가이드 */}
        <div className="text-center mt-16">
          <p className="text-blue-100 text-lg">
            {isExpanded 
              ? '카드에 마우스를 올려 자세한 내용을 확인하세요' 
              : '카드 스택을 클릭하여 펼쳐보세요'
            }
          </p>
        </div>
      </div>
    </section>
  );
};

export default Projects;