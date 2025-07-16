import { useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Outlines, Html, GizmoHelper, GizmoViewport, PivotControls } from "@react-three/drei";
import { Grid } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import { useSidebar } from "../../context/SidebarContext";
import { SceneProvider, useScene } from "../../context/SceneContext";
import EditorSidebar from "../../layouts/EditorSidebar";
import * as THREE from 'three';

const Editor = () => {
    return (
        <SceneProvider>
            <EditorContent />
        </SceneProvider>
    );
};

const EditorContent = () => {
    const [canvasHeight, setCanvasHeight] = useState("100vh");
    const [canvasWidth, setCanvasWidth] = useState("100%");
    const [isEditorSidebarOpen, setIsEditorSidebarOpen] = useState(true);
    const containerRef = useRef(null);
    const { isExpanded, isHovered, isMobileOpen } = useSidebar();

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
            className="flex h-full overflow-hidden dark:bg-gray-900" 
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

                <Canvas
                    camera={{ position: [10, 10, 10], fov: 50 }}
                    gl={{ preserveDrawingBuffer: true }}
                >
                    <EditorView />
                    <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                        <GizmoViewport />
                    </GizmoHelper>
                </Canvas>
            </div>
            
            {/* EditorSidebar */}
            <div 
                className={`h-full overflow-hidden transition-all duration-300 ease-in-out ${
                    isEditorSidebarOpen 
                        ? 'w-80' 
                        : 'w-0'
                }`}
            >
                <div className={`w-80 h-full transition-transform duration-300 ease-in-out ${
                    isEditorSidebarOpen 
                        ? 'translate-x-0' 
                        : '-translate-x-full'
                }`}>
                    <EditorSidebar />
                </div>
            </div>
        </div>
    );
};

const EditorView = () => {
    const { scene } = useGLTF("/models/IDC_CXARENA_V0.40.glb");
    const { updateSceneData, selectedNode } = useScene();

    useEffect(() => {
        if (scene) {
            const convertSceneToGraphData = (scene) => {
                if (!scene) return [];
                
                const convertNode = (node) => {
                    const graphNode = {
                        id: node.uuid || Math.random().toString(36).substr(2, 9),
                        name: node.name || 'Unnamed',
                        type: getNodeType(node),
                        visible: node.visible !== false,
                        renderable: true,
                        hasModifiers: hasModifiers(node),
                        children: []
                    };

                    if (node.children && node.children.length > 0) {
                        graphNode.children = node.children.map(convertNode);
                    }

                    return graphNode;
                };

                return [convertNode(scene)];
            };

            const getNodeType = (node) => {
                if (node.isScene) return 'scene';
                if (node.isGroup) return 'collection';
                if (node.isMesh) return 'mesh';
                if (node.isLight) return 'light';
                if (node.isCamera) return 'camera';
                if (node.isObject3D) return 'object';
                return 'unknown';
            };

            const hasModifiers = (node) => {
                return !!(node.geometry || node.material || node.userData);
            };

            const sceneData = convertSceneToGraphData(scene);
            updateSceneData(sceneData, scene);
        }
    }, [scene, updateSceneData]);

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={2} />
            <Grid position={[0, -0.05, 0]} args={[20, 20]} />
            
            <group position={[0, 0, 0]}>
                <primitive object={scene} />
            </group>
            
            {/* OrbitControls 추가 */}
            <OrbitControls 
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={1}
                maxDistance={100}
                maxPolarAngle={Math.PI / 2} // 90도로 제한하여 바닥으로 회전 방지
                minPolarAngle={0}
                enableDamping={true} // 부드러운 스크롤링을 위한 댐핑 활성화
                dampingFactor={0.05} // 댐핑 강도 (낮을수록 더 부드러움)
                rotateSpeed={0.5} // 회전 속도 조절
                zoomSpeed={0.8} // 줌 속도 조절
                panSpeed={0.8} // 팬 속도 조절
            />
            
            {selectedNode && (
                <PivotControls
                    object={scene}
                    anchor={[0, 0, 0]}
                    scale={1}
                    lineWidth={2}
                    fixed={false}
                    depthTest={false}
                    onDragStart={() => console.log('Transform started')}
                    onDragEnd={() => console.log('Transform ended')}
                />
            )}
        </>
    );
};

export default Editor;