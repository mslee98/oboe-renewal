import { useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Outlines, Html } from "@react-three/drei";
import { Grid } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import { useSidebar } from "../../context/SidebarContext";
import EditorSidebar from "../../layouts/EditorSidebar";
import * as THREE from 'three';

const Editor = () => {
    const [canvasHeight, setCanvasHeight] = useState("100vh");
    const [canvasWidth, setCanvasWidth] = useState("100%");
    const [isEditorSidebarOpen, setIsEditorSidebarOpen] = useState(true);
    const containerRef = useRef(null);
    const { isExpanded, isHovered, isMobileOpen } = useSidebar();

    const [sceneData, setSceneData] = useState(null);
    const [originalScene, setOriginalScene] = useState(null);

    useEffect(() => {
        const updateDimensions = () => {
            const header = document.querySelector('header');
            const sidebar = document.querySelector('aside'); // 사이드바 요소
            
            if (header && containerRef.current) {
                const headerHeight = header.offsetHeight;
                const headerBorder = parseInt(getComputedStyle(header).borderBottomWidth) || 0;
                const totalHeaderHeight = headerHeight + headerBorder;
                
                // 약간의 여유 공간을 두어 스크롤 방지
                const newHeight = `calc(100vh - ${totalHeaderHeight}px)`;
                setCanvasHeight(newHeight);
            }

            // 사이드바 너비 계산
            if (sidebar) {
                const sidebarWidth = sidebar.offsetWidth;
                const sidebarBorder = parseInt(getComputedStyle(sidebar).borderRightWidth) || 0;
                const totalSidebarWidth = sidebarWidth + sidebarBorder;
                
                // lg 브레이크포인트 이상에서만 사이드바 너비 적용
                const isLargeScreen = window.innerWidth >= 1024;
                if (isLargeScreen && !isMobileOpen) {
                    // EditorSidebar가 열려있을 때 추가 너비 계산
                    const editorSidebarWidth = isEditorSidebarOpen ? 320 : 0; // 320px = w-80
                    setCanvasWidth(`calc(100vw - ${totalSidebarWidth}px - ${editorSidebarWidth}px)`);
                } else {
                    const editorSidebarWidth = isEditorSidebarOpen ? 320 : 0;
                    setCanvasWidth(`calc(100vw - ${editorSidebarWidth}px)`);
                }
            }
        };

        // 초기 실행
        updateDimensions();
        
        // 리사이즈 이벤트 리스너
        window.addEventListener('resize', updateDimensions);
        
        // 사이드바 상태 변경 시에도 업데이트
        const resizeObserver = new ResizeObserver(updateDimensions);
        const header = document.querySelector('header');
        const sidebar = document.querySelector('aside');
        
        if (header) resizeObserver.observe(header);
        if (sidebar) resizeObserver.observe(sidebar);
        
        return () => {
            window.removeEventListener('resize', updateDimensions);
            resizeObserver.disconnect();
        };
    }, [isExpanded, isHovered, isMobileOpen, isEditorSidebarOpen]);

    const handleToggleEditorSidebar = () => {
        setIsEditorSidebarOpen(!isEditorSidebarOpen);
    };

    return (
        <div 
            ref={containerRef} 
            className="flex h-full overflow-hidden" 
            style={{ 
                height: canvasHeight,
                position: 'relative'
            }}
        >
            {/* Canvas 영역 */}
            <div 
                className="flex-1 relative"
                style={{ 
                    width: canvasWidth,
                }}
            >
                {/* EditorSidebar 토글 버튼 */}
                <button
                    onClick={handleToggleEditorSidebar}
                    className="absolute top-4 right-4 z-10 p-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-lg transition-colors border border-gray-200 dark:border-gray-700"
                    aria-label="Toggle Editor Sidebar"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <Canvas camera={{ position: [2, 5, 3] }}>
                    <color attach="background" args={["#1a1a2e"]} />

                    {/* 환경 조명 강화 */}
                    <ambientLight intensity={0.8} />
                    
                    {/* 메인 방향성 조명 */}
                    <directionalLight 
                        position={[5, 5, 5]} 
                        intensity={1.5}
                        castShadow
                        shadow-mapSize-width={2048}
                        shadow-mapSize-height={2048}
                    />
                    
                    {/* 보조 조명들 */}
                    <directionalLight 
                        position={[-5, 3, -5]} 
                        intensity={0.8}
                        color="#ffffff"
                    />
                    
                    <pointLight 
                        position={[0, 10, 0]} 
                        intensity={1}
                        color="#ffffff"
                        distance={20}
                    />
                    
                    {/* 전면 조명 */}
                    <directionalLight 
                        position={[0, 0, 5]} 
                        intensity={0.6}
                        color="#ffffff"
                    />

                    <EditorView setSceneData={setSceneData} setOriginalScene={setOriginalScene}/>

                    {/* 메인 그리드 - 황금빛 사이버펑크 */}
                    <Grid
                        position={[0, 0, 0]}
                        args={[100, 100]}
                        sectionColorA={[1, 0.8, 0]}      // 골드
                        sectionColorB={[1, 0.4, 0]}     // 오렌지
                        sectionSize={2}
                        fadeStrength={2.5}
                        infiniteGrid={true}
                        cellColor={[0.3, 0.2, 0.1]}     // 어두운 브라운
                        cellSize={0.5}
                        cellThickness={0.3}
                        cellOffset={[0, 0]}
                    />

                    {/* 보조 그리드 - 네온 퍼플 */}
                    <Grid
                        position={[0, 0.01, 0]}
                        args={[50, 50]}
                        sectionColorA={[0.8, 0, 1]}     // 네온 퍼플
                        sectionColorB={[0.4, 0, 0.8]}   // 다크 퍼플
                        sectionSize={5}
                        fadeStrength={1.8}
                        infiniteGrid={true}
                        cellColor={[0.2, 0.1, 0.3]}     // 어두운 퍼플
                        cellSize={2}
                        cellThickness={0.2}
                        cellOffset={[0.5, 0.5]}
                    />

                    {/* 배경 그리드 - 네온 블루 */}
                    <Grid
                        position={[0, -0.01, 0]}
                        args={[200, 200]}
                        sectionColorA={[0, 0.8, 1]}     // 네온 블루
                        sectionColorB={[0, 0.4, 0.8]}   // 다크 블루
                        sectionSize={10}
                        fadeStrength={3}
                        infiniteGrid={true}
                        cellColor={[0.1, 0.2, 0.3]}     // 어두운 블루
                        cellSize={5}
                        cellThickness={0.1}
                        cellOffset={[0, 0]}
                    />

                    <OrbitControls />
                </Canvas>
            </div>

            {/* EditorSidebar - 데스크톱에서만 표시 */}
            <div className={`hidden lg:block transition-all duration-300 ease-in-out ${
                isEditorSidebarOpen ? 'w-80' : 'w-0'
            }`}>
                {isEditorSidebarOpen && (
                    <EditorSidebar 
                        sceneData={sceneData} 
                        originalScene={originalScene}
                    />
                )}
            </div>

            {/* 모바일용 EditorSidebar 오버레이 */}
            {/* {isEditorSidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleToggleEditorSidebar} />
                    <div className="absolute right-0 top-0 h-full w-80">
                        <EditorSidebar />
                    </div>
                </div>
            )} */}
        </div>
    )
}

const EditorView = ({setSceneData, setOriginalScene}) => {
    const { nodes, scene } = useGLTF('/models/IDC_CXARENA_V0.40.glb');

    useEffect(() => {
        if (scene) {
            setSceneData(scene);
            setOriginalScene(scene);
        }
    }, [scene, setSceneData, setOriginalScene]);

    const [hovered, setHovered] = useState(null);
    return (
        <group position={[0, 0.1, 0]}>
            <primitive object={scene} />
        </group>
    )
};

export default Editor;