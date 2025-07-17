import { useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Outlines, Html, GizmoHelper, GizmoViewport, PivotControls, TransformControls } from "@react-three/drei";
import { Grid } from "@react-three/drei";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
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

// 히스토리 컨트롤 컴포넌트
const HistoryControls = () => {
    const { 
        undo, 
        redo, 
        currentIndex, 
        history, 
        clearHistory 
    } = useScene();

    const canUndo = currentIndex > 0;
    const canRedo = currentIndex < history.length - 1;

    return (
        <div className="absolute top-4 left-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
            <div className="flex space-x-2">
                <button
                    onClick={undo}
                    disabled={!canUndo}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        canUndo
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }`}
                    aria-label="Undo"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                </button>
                
                <button
                    onClick={redo}
                    disabled={!canRedo}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        canRedo
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }`}
                    aria-label="Redo"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                    </svg>
                </button>
                
                <button
                    onClick={clearHistory}
                    className="px-3 py-2 text-sm font-medium rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
                    aria-label="Clear History"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
            
            {/* 히스토리 상태 표시 */}
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                History: {currentIndex + 1} / {history.length}
            </div>
        </div>
    );
};

const EditorContent = () => {
    const [canvasHeight, setCanvasHeight] = useState("100vh");
    const [canvasWidth, setCanvasWidth] = useState("100%");
    const [isEditorSidebarOpen, setIsEditorSidebarOpen] = useState(true);
    const containerRef = useRef(null);
    const { isExpanded, isHovered, isMobileOpen } = useSidebar();
    const { undo, redo } = useScene(); // useScene에서 undo, redo 가져오기

    // 키보드 이벤트 핸들러 추가
    useEffect(() => {
        const handleKeyDown = (event) => {
            // Ctrl+Z (Undo)
            if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
                event.preventDefault();
                console.log('Ctrl+Z pressed - Undo');
                undo();
            }
            
            // Ctrl+Y 또는 Ctrl+Shift+Z (Redo)
            if ((event.ctrlKey || event.metaKey) && 
                ((event.key === 'y') || (event.key === 'z' && event.shiftKey))) {
                event.preventDefault();
                console.log('Ctrl+Y or Ctrl+Shift+Z pressed - Redo');
                redo();
            }
        };

        // 전역 키보드 이벤트 리스너 추가
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [undo, redo]);

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

                {/* 히스토리 컨트롤 */}
                <HistoryControls />

                {/* Transform Mode Controls */}
                <TransformModeControls />

                <Canvas
                    camera={{ position: [10, 10, 10], fov: 50 }}
                    gl={{ 
                        preserveDrawingBuffer: false, // 성능 개선
                        antialias: true 
                    }}
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
    const { updateSceneData, selectedNode, transformMode, findNodeById, selectNode, sceneData } = useScene();
    const selectedObjectRef = useRef(null);
    const hasInitializedRef = useRef(false);
    const { camera } = useThree();

    // 노드 타입 판별 함수
    const getNodeType = (node) => {
        if (node.isScene) return 'scene';
        if (node.isGroup) return 'collection';
        if (node.isMesh) return 'mesh';
        if (node.isLight) return 'light';
        if (node.isCamera) return 'camera';
        if (node.isObject3D) return 'object';
        return 'unknown';
    };

    useEffect(() => {
        if (modelScene && !hasInitializedRef.current) {
            console.log('=== EDITOR VIEW INITIALIZATION ===');
            hasInitializedRef.current = true;
            
            const convertSceneToGraphData = (scene) => {
                if (!scene) return [];
                
                const convertNode = (node) => {
                    const graphNode = {
                        id: node.uuid,
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

            const hasModifiers = (node) => {
                return !!(node.geometry || node.material || node.userData);
            };

            const sceneData = convertSceneToGraphData(modelScene);
            console.log('Calling updateSceneData');
            updateSceneData(sceneData, modelScene);
        }
    }, [modelScene, updateSceneData]);

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={2} />
            <Grid position={[0, -0.05, 0]} args={[20, 20]} />
            
            {/* 원본 씬 렌더링 */}
            <primitive object={modelScene} />
            
            {/* 클릭 이벤트 처리를 위한 컴포넌트 */}
            <CanvasClickHandler />
        </>
    );
};

// Canvas 클릭 이벤트를 처리하는 컴포넌트
const CanvasClickHandler = () => {
    const { camera, scene } = useThree();
    const raycasterRef = useRef(new THREE.Raycaster());
    const mouseRef = useRef(new THREE.Vector2());
    const { selectNode, findNodeById } = useScene();
    const [hoveredObject, setHoveredObject] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    // 상위 그룹을 찾는 함수
    const findTopLevelGroup = (object) => {
        let current = object;
        
        // Scene의 직접적인 자식까지 올라가기
        while (current.parent && current.parent.type !== 'Scene') {
            current = current.parent;
        }
        
        return current;
    };

    // 이름 패턴으로 상위 그룹 찾기 (예: SerRackA_001)
    const findParentGroupByName = (object) => {
        let current = object;
        
        while (current.parent && current.parent.type !== 'Scene') {
            // SerRack 패턴을 가진 그룹 찾기
            if (current.parent.name && current.parent.name.includes('SerRack')) {
                return current.parent;
            }
            current = current.parent;
        }
        
        return object; // 찾지 못하면 원본 객체 반환
    };

    const handleCanvasMouseMove = useCallback((event) => {
        // 마우스 좌표를 정규화된 좌표로 변환
        const rect = event.target.getBoundingClientRect();
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // 마우스 위치 저장
        setMousePosition({ x: event.clientX, y: event.clientY });

        // 레이캐스터 설정
        raycasterRef.current.setFromCamera(mouseRef.current, camera);

        // 씬에서 교차하는 객체 찾기
        const intersects = raycasterRef.current.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            const hoveredObject = intersects[0].object;
            const topLevelGroup = findParentGroupByName(hoveredObject);
            setHoveredObject(topLevelGroup);
        } else {
            setHoveredObject(null);
        }
    }, [camera, scene]);

    const handleCanvasClick = useCallback((event) => {
        console.log('Canvas clicked!');
        
        // 마우스 좌표를 정규화된 좌표로 변환
        const rect = event.target.getBoundingClientRect();
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        console.log('Mouse coordinates:', mouseRef.current.x, mouseRef.current.y);

        // 레이캐스터 설정
        raycasterRef.current.setFromCamera(mouseRef.current, camera);

        // 씬에서 교차하는 객체 찾기
        const intersects = raycasterRef.current.intersectObjects(scene.children, true);

        console.log('Intersects found:', intersects.length);

        if (intersects.length > 0) {
            const selectedObject = intersects[0].object;
            console.log('Selected object:', selectedObject);
            
            // 상위 그룹 찾기
            const topLevelGroup = findParentGroupByName(selectedObject);
            console.log('Top level group:', topLevelGroup);
            
            // findNodeById로 노드 정보 가져오기
            const node = findNodeById(topLevelGroup.uuid);
            
            if (node) {
                const nodeInfo = {
                    id: node.uuid,
                    name: node.name || 'Unnamed',
                    type: getNodeType(node),
                    position: {
                        x: node.position.x,
                        y: node.position.y,
                        z: node.position.z
                    },
                    rotation: {
                        x: node.rotation.x,
                        y: node.rotation.y,
                        z: node.rotation.z
                    },
                    scale: {
                        x: node.scale.x,
                        y: node.scale.y,
                        z: node.scale.z
                    }
                };

                console.log('Selected node info:', nodeInfo);
                selectNode(nodeInfo);
            } else {
                console.log('Node not found in scene data');
                selectNode(null);
            }
        } else {
            console.log('No object selected');
            selectNode(null);
        }
    }, [camera, scene, selectNode, findNodeById]);

    // 노드 타입 판별 함수
    const getNodeType = (node) => {
        if (node.isScene) return 'scene';
        if (node.isGroup) return 'collection';
        if (node.isMesh) return 'mesh';
        if (node.isLight) return 'light';
        if (node.isCamera) return 'camera';
        if (node.isObject3D) return 'object';
        return 'unknown';
    };

    // Canvas에 이벤트 추가
    useEffect(() => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            console.log('Adding events to canvas');
            canvas.addEventListener('click', handleCanvasClick);
            canvas.addEventListener('mousemove', handleCanvasMouseMove);
            return () => {
                console.log('Removing events from canvas');
                canvas.removeEventListener('click', handleCanvasClick);
                canvas.removeEventListener('mousemove', handleCanvasMouseMove);
            };
        } else {
            console.log('Canvas not found');
        }
    }, [handleCanvasClick, handleCanvasMouseMove]);

    // 호버 라벨 렌더링 - 객체 위치에 따라가는 버전
    if (!hoveredObject) return null;

    // 객체의 월드 위치 계산
    const worldPosition = new THREE.Vector3();
    hoveredObject.getWorldPosition(worldPosition);

    return (
        <Html 
            position={[worldPosition.x, worldPosition.y, worldPosition.z]}
            style={{ 
                pointerEvents: 'none',
                transform: 'translate(-50%, -100%)',
                marginTop: '-10px'
            }}
        >
            <div
                className="bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm font-medium whitespace-nowrap"
                style={{
                    pointerEvents: 'none',
                }}
            >
                {hoveredObject.name || 'Unnamed Object'}
            </div>
        </Html>
    );
};

const Controls = () => {
    const { scene } = useThree();
    const { 
        selectedNode, 
        transformMode, 
        modes, 
        updateNodePosition, 
        updateNodeRotation, 
        updateNodeScale, 
        addToHistory
    } = useScene();
    const [selectedObject, setSelectedObject] = useState(null);
    const [isTransformActive, setIsTransformActive] = useState(false);
    const [initialTransformState, setInitialTransformState] = useState(null);
    const transformControlsRef = useRef(null);
    const orbitControlsRef = useRef(null);

    useEffect(() => {
        if(selectedNode) {
            // UUID로 객체 찾기
            const node = scene.getObjectByProperty('uuid', selectedNode.id);
            setSelectedObject(node);
            console.log('Selected object found:', node);
        } else {
            setSelectedObject(null);
        }
    }, [selectedNode, scene]);

    // TransformControls 이벤트 핸들러
    const handleTransformStart = () => {
        console.log('=== TRANSFORM START ===');
        setIsTransformActive(true);
        
        // Transform 시작 시 초기 상태 저장
        if (selectedObject) {
            setInitialTransformState({
                position: { 
                    x: selectedObject.position.x, 
                    y: selectedObject.position.y, 
                    z: selectedObject.position.z 
                },
                rotation: { 
                    x: selectedObject.rotation.x, 
                    y: selectedObject.rotation.y, 
                    z: selectedObject.rotation.z 
                },
                scale: { 
                    x: selectedObject.scale.x, 
                    y: selectedObject.scale.y, 
                    z: selectedObject.scale.z 
                }
            });
        }
        
        if (orbitControlsRef.current) {
            orbitControlsRef.current.enabled = false;
        }
    };

    const handleTransformEnd = () => {
        console.log('=== TRANSFORM END ===');
        setIsTransformActive(false);
        
        if (orbitControlsRef.current) {
            orbitControlsRef.current.enabled = true;
        }
        
        // Transform이 끝날 때 히스토리 저장
        if (selectedObject && selectedNode && initialTransformState) {
            // 최종 상태
            const finalState = {
                position: { 
                    x: selectedObject.position.x, 
                    y: selectedObject.position.y, 
                    z: selectedObject.position.z 
                },
                rotation: { 
                    x: selectedObject.rotation.x, 
                    y: selectedObject.rotation.y, 
                    z: selectedObject.rotation.z 
                },
                scale: { 
                    x: selectedObject.scale.x, 
                    y: selectedObject.scale.y, 
                    z: selectedObject.scale.z 
                }
            };
            
            // 상태가 실제로 변경되었는지 확인
            const hasChanged = 
                initialTransformState.position.x !== finalState.position.x ||
                initialTransformState.position.y !== finalState.position.y ||
                initialTransformState.position.z !== finalState.position.z ||
                initialTransformState.rotation.x !== finalState.rotation.x ||
                initialTransformState.rotation.y !== finalState.rotation.y ||
                initialTransformState.rotation.z !== finalState.rotation.z ||
                initialTransformState.scale.x !== finalState.scale.x ||
                initialTransformState.scale.y !== finalState.scale.y ||
                initialTransformState.scale.z !== finalState.scale.z;
            
            if (hasChanged) {
                console.log('Transform changed, saving to history');
                
                // 히스토리에 저장 (변경 전 상태와 변경 후 상태 모두 저장)
                addToHistory({
                    type: 'transform',
                    nodeId: selectedNode.id,
                    beforeState: initialTransformState,  // 변경 전 상태
                    afterState: finalState,             // 변경 후 상태
                    timestamp: Date.now()
                });
            }
            
            setInitialTransformState(null);
        }
    };

    // Transform 변경 중 이벤트 (드래그 중일 때)
    const handleTransformChange = () => {
        if (selectedObject && selectedNode && isTransformActive) {
            // 실시간으로 SceneContext 업데이트만
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
            {selectedObject && (
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
                top: `${position.y + 5}px`,
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