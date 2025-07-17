import { useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Outlines, Html, GizmoHelper, GizmoViewport, PivotControls, TransformControls } from "@react-three/drei";
import { Grid } from "@react-three/drei";
import { useRef, useState, useEffect, useCallback } from "react";
import { useSidebar } from "../../context/SidebarContext";
import { SceneProvider, useScene } from "../../context/SceneContext";
import EditorSidebar from "../../layouts/EditorSidebar";
import { useThree } from "@react-three/fiber";
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

                {/* Transform Mode Controls */}
                <TransformModeControls />

                <Canvas
                    camera={{ position: [10, 10, 10], fov: 50 }}
                    gl={{ preserveDrawingBuffer: true }}
                >
                    <EditorView />
                    <Controls />
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
    const { scene: modelScene } = useGLTF("/models/IDC_CXARENA_V0.40.glb");
    const { updateSceneData, selectedNode, transformMode, findNodeById } = useScene();
    const selectedObjectRef = useRef(null);

    useEffect(() => {
        if (modelScene) {
            const convertSceneToGraphData = (scene) => {
                if (!scene) return [];
                
                const convertNode = (node) => {
                    const graphNode = {
                        id: node.uuid, // UUID를 ID로 사용
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

            const sceneData = convertSceneToGraphData(modelScene);
            updateSceneData(sceneData, modelScene);
        }
    }, [modelScene, updateSceneData]);

    
    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={2} />
            <Grid position={[0, -0.05, 0]} args={[20, 20]} />
            
            {/* 원본 씬 렌더링 */}
            <group position={[0, 0, 0]}>
                <primitive object={modelScene} />
            </group>

            <Controls/>
            
        </>
    );
};

const Controls = () => {
    const { scene } = useThree();
    const { selectedNode, transformMode, modes, updateNodePosition, updateNodeRotation, updateNodeScale, triggerObjectTransformUpdate } = useScene();
    const [selectedObject, setSelectedObject] = useState(null);
    const [isTransformActive, setIsTransformActive] = useState(false);
    const transformControlsRef = useRef(null);
    const orbitControlsRef = useRef(null);

    useEffect(() => {
        if(selectedNode) {
            const node = scene.getObjectByName(selectedNode.name);
            setSelectedObject(node);
        }
    }, [selectedNode]);

    // TransformControls 이벤트 핸들러
    const handleTransformStart = () => {
        setIsTransformActive(true);
        if (orbitControlsRef.current) {
            orbitControlsRef.current.enabled = false;
        }
    };

    const handleTransformEnd = () => {
        setIsTransformActive(false);
        if (orbitControlsRef.current) {
            orbitControlsRef.current.enabled = true;
        }
        
        // Transform이 끝날 때 최종 값 업데이트
        if (selectedObject && selectedNode) {
            updateNodePosition(selectedNode.id, {
                x: selectedObject.position.x,
                y: selectedObject.position.y,
                z: selectedObject.position.z
            });

            updateNodeRotation(selectedNode.id, {
                x: selectedObject.rotation.x,
                y: selectedObject.rotation.y,
                z: selectedObject.rotation.z
            });

            updateNodeScale(selectedNode.id, {
                x: selectedObject.scale.x,
                y: selectedObject.scale.y,
                z: selectedObject.scale.z
            });
        }
    };

    // Transform 변경 중 이벤트 (드래그 중일 때)
    const handleTransformChange = () => {
        if (selectedObject && selectedNode && isTransformActive) {
            // 실시간으로 SceneContext 업데이트
            updateNodePosition(selectedNode.id, {
                x: selectedObject.position.x,
                y: selectedObject.position.y,
                z: selectedObject.position.z
            });

            updateNodeRotation(selectedNode.id, {
                x: selectedObject.rotation.x,
                y: selectedObject.rotation.y,
                z: selectedObject.rotation.z
            });

            updateNodeScale(selectedNode.id, {
                x: selectedObject.scale.x,
                y: selectedObject.scale.y,
                z: selectedObject.scale.z
            });
        }
    };

    return (
        <>
            {selectedNode && (
                <TransformControls
                    ref={transformControlsRef}
                    object={selectedObject}
                    mode={modes[transformMode]}
                    rotationSnap={Math.PI / 12}
                    onMouseDown={handleTransformStart}
                    onMouseUp={handleTransformEnd}
                    onChange={handleTransformChange}
                />
            )}

            <OrbitControls 
                ref={orbitControlsRef}
                makeDefault
                enablePan={!isTransformActive}
                enableZoom={!isTransformActive}
                enableRotate={!isTransformActive}
                minDistance={1}
                maxDistance={100}
                maxPolarAngle={Math.PI / 2}
                minPolarAngle={0}
                enableDamping={true}
                dampingFactor={0.05}
                rotateSpeed={0.5}
                zoomSpeed={0.8}
                panSpeed={0.8}
            />
        </>
    )
}

// Transform Mode Controls 컴포넌트
const TransformModeControls = () => {
    const { transformMode, modes, changeTransformMode, selectedNode, findNodeById } = useScene();
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleModeChange = (modeIndex) => {
        changeTransformMode(modeIndex);
    };

    // 선택된 노드의 위치를 기반으로 UI 위치 계산
    useEffect(() => {
        if (selectedNode) {
            const node = findNodeById(selectedNode.id);
            
            if (node && node.position) {
                // Canvas 요소 찾기
                const canvas = document.querySelector('canvas');
                if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    
                    // 간단한 투영 계산 (카메라 위치 기반)
                    // 실제 카메라 위치는 고정값으로 가정 (EditorView에서 설정된 값)
                    const cameraPosition = { x: 10, y: 10, z: 10 };
                    const cameraDistance = 10;
                    
                    // 월드 좌표를 정규화된 좌표로 변환
                    const normalizedX = (node.position.x / cameraDistance) * 0.5 + 0.5;
                    const normalizedY = (-node.position.y / cameraDistance) * 0.5 + 0.5;
                    
                    // Canvas 좌표로 변환
                    const x = normalizedX * rect.width;
                    const y = normalizedY * rect.height;
                    
                    // UI가 화면 밖으로 나가지 않도록 조정
                    const uiWidth = 200;
                    const uiHeight = 50;
                    
                    const adjustedX = Math.max(uiWidth / 2, Math.min(rect.width - uiWidth / 2, x));
                    const adjustedY = Math.max(uiHeight / 2, Math.min(rect.height - uiHeight / 2, y));
                    
                    setPosition({
                        x: adjustedX,
                        y: adjustedY
                    });
                }
            }
        }
    }, [selectedNode, findNodeById]);

    if (!selectedNode) return null;

    return (
        <div 
            className="absolute z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2"
            style={{
                left: `${position.x}px`,
                top: `${position.y + 10}px`,
                transform: 'translate(-50%, -50%)'
            }}
        >
            <div className="flex space-x-1">
                {modes.map((mode, index) => (
                    <button
                        key={mode}
                        onClick={() => handleModeChange(index)}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            transformMode === index
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                        aria-label={`Switch to ${mode} mode`}
                    >
                        {mode === 'translate' && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                        )}
                        {mode === 'rotate' && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        )}
                        {mode === 'scale' && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Editor;