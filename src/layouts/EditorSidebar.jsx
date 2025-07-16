import { useState, useRef, useEffect } from 'react';
import SceneGraph from '../components/Editor/SceneGraph';
import { useScene } from '../context/SceneContext';

const EditorSidebar = () => {
    const [activeTab, setActiveTab] = useState('properties');
    const [sceneGraphHeight, setSceneGraphHeight] = useState(300); // 기본 높이
    const [isResizing, setIsResizing] = useState(false);
    const [transformMode, setTransformMode] = useState('translate'); // translate, rotate, scale
    const resizeRef = useRef(null);
    
    const { 
        sceneData, 
        selectedNode, 
        selectNode, 
        toggleNodeVisibility,
        updateNodePosition,
        updateNodeRotation,
        updateNodeScale,
        updateNodeColor,
        updateNodeOpacity,
        findNodeById
    } = useScene();

    // 선택된 노드의 현재 속성들
    const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
    const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
    const [scale, setScale] = useState({ x: 1, y: 1, z: 1 });
    const [color, setColor] = useState('#ffffff');
    const [opacity, setOpacity] = useState(1);

    // 선택된 노드가 변경될 때 속성 값들을 업데이트
    useEffect(() => {
        if (selectedNode) {
            const node = findNodeById(selectedNode.id);
            if (node) {
                // 위치
                setPosition({
                    x: node.position.x,
                    y: node.position.y,
                    z: node.position.z
                });

                // 회전 (라디안을 도로 변환)
                setRotation({
                    x: (node.rotation.x * 180) / Math.PI,
                    y: (node.rotation.y * 180) / Math.PI,
                    z: (node.rotation.z * 180) / Math.PI
                });

                // 스케일
                setScale({
                    x: node.scale.x,
                    y: node.scale.y,
                    z: node.scale.z
                });

                // 색상
                if (node.material) {
                    if (Array.isArray(node.material)) {
                        setColor('#' + node.material[0].color.getHexString());
                    } else {
                        setColor('#' + node.material.color.getHexString());
                    }
                }

                // 투명도
                if (node.material) {
                    if (Array.isArray(node.material)) {
                        setOpacity(node.material[0].opacity || 1);
                    } else {
                        setOpacity(node.material.opacity || 1);
                    }
                }
            }
        }
    }, [selectedNode, findNodeById]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    // Transform 모드 변경
    const handleTransformModeChange = (mode) => {
        setTransformMode(mode);
        // 여기서 전역 상태로 Transform 모드를 업데이트할 수 있습니다
        console.log('Transform mode changed to:', mode);
    };

    // 위치 변경 핸들러
    const handlePositionChange = (axis, value) => {
        if (!selectedNode) return;
        
        const newPosition = { ...position, [axis]: parseFloat(value) };
        setPosition(newPosition);
        updateNodePosition(selectedNode.id, newPosition);
    };

    // 회전 변경 핸들러
    const handleRotationChange = (axis, value) => {
        if (!selectedNode) return;
        
        const newRotation = { ...rotation, [axis]: parseFloat(value) };
        setRotation(newRotation);
        // 도를 라디안으로 변환
        const radians = {
            x: (newRotation.x * Math.PI) / 180,
            y: (newRotation.y * Math.PI) / 180,
            z: (newRotation.z * Math.PI) / 180
        };
        updateNodeRotation(selectedNode.id, radians);
    };

    // 스케일 변경 핸들러
    const handleScaleChange = (axis, value) => {
        if (!selectedNode) return;
        
        const newScale = { ...scale, [axis]: parseFloat(value) };
        setScale(newScale);
        updateNodeScale(selectedNode.id, newScale);
    };

    // 색상 변경 핸들러
    const handleColorChange = (newColor) => {
        if (!selectedNode) return;
        
        setColor(newColor);
        updateNodeColor(selectedNode.id, newColor);
    };

    // 투명도 변경 핸들러
    const handleOpacityChange = (newOpacity) => {
        if (!selectedNode) return;
        
        setOpacity(newOpacity);
        updateNodeOpacity(selectedNode.id, newOpacity);
    };

    // 리사이즈 시작
    const handleResizeStart = (e) => {
        e.preventDefault();
        setIsResizing(true);
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
    };

    // 리사이즈 중
    const handleResizeMove = (e) => {
        if (!isResizing) return;

        const sidebar = resizeRef.current?.closest('.editor-sidebar');
        if (!sidebar) return;

        const sidebarRect = sidebar.getBoundingClientRect();
        const newHeight = e.clientY - sidebarRect.top - 200; // 최소 높이 보장

        // 최소/최대 높이 제한
        const minHeight = 150;
        const maxHeight = sidebarRect.height - 200;
        
        setSceneGraphHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)));
    };

    // 리사이즈 종료
    const handleResizeEnd = () => {
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };

    // 마우스 이벤트 리스너
    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeEnd);
            
            return () => {
                document.removeEventListener('mousemove', handleResizeMove);
                document.removeEventListener('mouseup', handleResizeEnd);
            };
        }
    }, [isResizing]);

    return (
        <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col h-full editor-sidebar">
            {/* 헤더 */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Editor Panel</h2>
            </div>

            {/* 씬 그래프 영역 */}
            <div 
                ref={resizeRef}
                className="flex-shrink-0"
                style={{ height: `${sceneGraphHeight}px` }}
            >
                <SceneGraph 
                    sceneData={sceneData}
                    onNodeSelect={selectNode}
                    selectedNode={selectedNode}
                    onVisibilityToggle={toggleNodeVisibility}
                />
            </div>

            {/* 리사이즈 핸들 */}
            <div
                className="h-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-row-resize flex-shrink-0 relative group"
                onMouseDown={handleResizeStart}
                aria-label="Resize scene graph"
            >
                {/* 리사이즈 핸들 시각적 표시 */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-0.5 bg-gray-400 dark:bg-gray-500 group-hover:bg-gray-600 dark:group-hover:bg-gray-400 rounded transition-colors"></div>
                </div>
            </div>

            {/* 탭 네비게이션 */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <button
                    onClick={() => handleTabChange('properties')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'properties'
                            ? 'text-brand-500 dark:text-brand-400 border-b-2 border-brand-500 dark:border-brand-400 bg-brand-50 dark:bg-brand-500/[0.12]'
                            : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                >
                    Properties
                </button>
                <button
                    onClick={() => handleTabChange('tools')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'tools'
                            ? 'text-brand-500 dark:text-brand-400 border-b-2 border-brand-500 dark:border-brand-400 bg-brand-50 dark:bg-brand-500/[0.12]'
                            : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                >
                    Tools
                </button>
                <button
                    onClick={() => handleTabChange('layers')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'layers'
                            ? 'text-brand-500 dark:text-brand-400 border-b-2 border-brand-500 dark:border-brand-400 bg-brand-50 dark:bg-brand-500/[0.12]'
                            : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                >
                    Layers
                </button>
            </div>

            {/* 탭 컨텐츠 */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'properties' && (
                    <div className="space-y-4">
                        {selectedNode ? (
                            <>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">Selected: {selectedNode.name}</h3>
                                </div>

                                {/* 기즈모 모드 선택 */}
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">Gizmo Mode</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={() => handleTransformModeChange('translate')}
                                            className={`px-3 py-2 text-xs rounded transition-colors ${
                                                transformMode === 'translate' 
                                                    ? 'bg-brand-500 text-white' 
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            Move
                                        </button>
                                        <button
                                            onClick={() => handleTransformModeChange('rotate')}
                                            className={`px-3 py-2 text-xs rounded transition-colors ${
                                                transformMode === 'rotate' 
                                                    ? 'bg-brand-500 text-white' 
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            Rotate
                                        </button>
                                        <button
                                            onClick={() => handleTransformModeChange('scale')}
                                            className={`px-3 py-2 text-xs rounded transition-colors ${
                                                transformMode === 'scale' 
                                                    ? 'bg-brand-500 text-white' 
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            Scale
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Transform 섹션 */}
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">Transform</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Position X</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={position.x}
                                                onChange={(e) => handlePositionChange('x', e.target.value)}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Position Y</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={position.y}
                                                onChange={(e) => handlePositionChange('y', e.target.value)}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Position Z</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={position.z}
                                                onChange={(e) => handlePositionChange('z', e.target.value)}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Rotation 섹션 */}
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">Rotation</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Rotation X (degrees)</label>
                                            <input
                                                type="number"
                                                step="1"
                                                value={rotation.x}
                                                onChange={(e) => handleRotationChange('x', e.target.value)}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Rotation Y (degrees)</label>
                                            <input
                                                type="number"
                                                step="1"
                                                value={rotation.y}
                                                onChange={(e) => handleRotationChange('y', e.target.value)}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Rotation Z (degrees)</label>
                                            <input
                                                type="number"
                                                step="1"
                                                value={rotation.z}
                                                onChange={(e) => handleRotationChange('z', e.target.value)}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Scale 섹션 */}
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">Scale</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Scale X</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                value={scale.x}
                                                onChange={(e) => handleScaleChange('x', e.target.value)}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Scale Y</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                value={scale.y}
                                                onChange={(e) => handleScaleChange('y', e.target.value)}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Scale Z</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                value={scale.z}
                                                onChange={(e) => handleScaleChange('z', e.target.value)}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Material 섹션 */}
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">Material</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Color</label>
                                            <input
                                                type="color"
                                                value={color}
                                                onChange={(e) => handleColorChange(e.target.value)}
                                                className="w-full h-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Opacity</label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.01"
                                                value={opacity}
                                                onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                                                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                                            />
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {Math.round(opacity * 100)}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm">Select a node to view properties</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'tools' && (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-3">Selection Tools</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <button className="px-3 py-2 bg-brand-500 hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-600 text-white text-sm rounded transition-colors">
                                    Select
                                </button>
                                <button className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm rounded transition-colors">
                                    Move
                                </button>
                                <button className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm rounded transition-colors">
                                    Rotate
                                </button>
                                <button className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm rounded transition-colors">
                                    Scale
                                </button>
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-3">View Tools</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <button className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm rounded transition-colors">
                                    Orbit
                                </button>
                                <button className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm rounded transition-colors">
                                    Pan
                                </button>
                                <button className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm rounded transition-colors">
                                    Zoom
                                </button>
                                <button className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm rounded transition-colors">
                                    Focus
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'layers' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-300">Scene Layers</h3>
                            <button className="text-brand-500 dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300 text-sm">
                                Add Layer
                            </button>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                <div className="flex items-center space-x-2">
                                    <input type="checkbox" defaultChecked className="text-brand-500 dark:text-brand-400 rounded" />
                                    <span className="text-sm text-gray-900 dark:text-white">Main Scene</span>
                                </div>
                                <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                <div className="flex items-center space-x-2">
                                    <input type="checkbox" defaultChecked className="text-brand-500 dark:text-brand-400 rounded" />
                                    <span className="text-sm text-gray-900 dark:text-white">Grid</span>
                                </div>
                                <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                <div className="flex items-center space-x-2">
                                    <input type="checkbox" defaultChecked className="text-brand-500 dark:text-brand-400 rounded" />
                                    <span className="text-sm text-gray-900 dark:text-white">Lights</span>
                                </div>
                                <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditorSidebar;