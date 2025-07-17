import { createContext, useContext, useState, useCallback } from 'react';
import * as THREE from 'three';

const SceneContext = createContext();

export const useScene = () => {
    const context = useContext(SceneContext);
    if (!context) {
        throw new Error("useScene must be used within a SceneProvider");
    }
    return context;
};

export const SceneProvider = ({ children }) => {
    const [sceneData, setSceneData] = useState(null);
    const [originalScene, setOriginalScene] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [transformMode, setTransformMode] = useState(0);
    const [hoveredNode, setHoveredNode] = useState(null);
    const [objectTransformUpdate, setObjectTransformUpdate] = useState(0);

    // 단순한 히스토리 관리
    const [history, setHistory] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);

    console.log("sceneData", sceneData);

    // Transform 모드 정의
    const modes = ['translate', 'rotate', 'scale'];

    // 객체 변화 감지 트리거
    const triggerObjectTransformUpdate = useCallback(() => {
        setObjectTransformUpdate(prev => prev + 1);
    }, []);

    // 노드 ID로 3D 객체 찾기
    const findNodeById = useCallback((nodeId) => {
        if (!originalScene) return null;
        
        const findInScene = (node) => {
            if (node.uuid === nodeId) {
                return node;
            }
            
            if (node.children) {
                for (const child of node.children) {
                    const found = findInScene(child);
                    if (found) return found;
                }
            }
            return null;
        };
        
        return findInScene(originalScene);
    }, [originalScene]);

    // 히스토리에 저장
    const addToHistory = useCallback((action) => {
        console.log('Adding to history:', action);
        
        setHistory(prev => {
            // 현재 인덱스 이후의 히스토리를 제거하고 새 항목 추가
            const newHistory = [...prev.slice(0, currentIndex + 1), action];
            
            // 최대 10개까지만 유지
            if (newHistory.length > 10) {
                return newHistory.slice(-10);
            }
            
            return newHistory;
        });
        
        setCurrentIndex(prev => prev + 1);
    }, [currentIndex]);

    // 히스토리에서 복원
    const restoreFromHistory = useCallback((index) => {
        console.log('Restoring from index:', index);
        
        if (index >= 0 && index < history.length) {
            const action = history[index];
            
            if (action.type === 'initial' && action.states) {
                // 초기 상태 복원
                action.states.forEach(state => {
                    const node = findNodeById(state.id);
                    if (node) {
                        node.position.set(state.position.x, state.position.y, state.position.z);
                        node.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
                        node.scale.set(state.scale.x, state.scale.y, state.scale.z);
                    }
                });
                triggerObjectTransformUpdate();
            } else if (action.type === 'transform' && action.nodeId) {
                const node = findNodeById(action.nodeId);
                if (node) {
                    // Undo인 경우: afterState에서 beforeState로 복원
                    // Redo인 경우: beforeState에서 afterState로 복원
                    const targetState = action.afterState || action.position; // 기존 호환성 유지
                    
                    // 위치 복원
                    if (targetState.position) {
                        node.position.set(targetState.position.x, targetState.position.y, targetState.position.z);
                    }
                    
                    // 회전 복원
                    if (targetState.rotation) {
                        node.rotation.set(targetState.rotation.x, targetState.rotation.y, targetState.rotation.z);
                    }
                    
                    // 스케일 복원
                    if (targetState.scale) {
                        node.scale.set(targetState.scale.x, targetState.scale.y, targetState.scale.z);
                    }
                    
                    triggerObjectTransformUpdate();
                }
            }
        }
    }, [history, findNodeById, triggerObjectTransformUpdate]);

    // Undo
    const undo = useCallback(() => {
        console.log('Undo - current index:', currentIndex);
        if (currentIndex > 0) {
            const newIndex = currentIndex - 1;
            setCurrentIndex(newIndex);
            restoreFromHistory(newIndex);
        }
    }, [currentIndex, restoreFromHistory]);

    // Redo
    const redo = useCallback(() => {
        console.log('Redo - current index:', currentIndex, 'history length:', history.length);
        if (currentIndex < history.length - 1) {
            const newIndex = currentIndex + 1;
            setCurrentIndex(newIndex);
            restoreFromHistory(newIndex);
        }
    }, [currentIndex, history.length, restoreFromHistory]);

    // 히스토리 초기화
    const clearHistory = useCallback(() => {
        console.log('Clearing history');
        setHistory([]);
        setCurrentIndex(-1);
    }, []);

    // 씬 데이터 설정
    const updateSceneData = useCallback((newSceneData, newOriginalScene) => {
        setSceneData(newSceneData);
        setOriginalScene(newOriginalScene);
        
        // 초기 상태를 히스토리에 추가 (실제 3D 객체의 상태 저장)
        const captureInitialState = (node) => {
            return {
                id: node.uuid,
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
        };

        const captureAllNodesState = (scene) => {
            const states = [];
            
            const traverse = (node) => {
                if (node.isMesh || node.isGroup) {
                    states.push(captureInitialState(node));
                }
                
                if (node.children) {
                    node.children.forEach(traverse);
                }
            };
            
            traverse(scene);
            return states;
        };

        const initialStates = captureAllNodesState(newOriginalScene);
        
        addToHistory({
            type: 'initial',
            states: initialStates,
            timestamp: Date.now()
        });
    }, [addToHistory]);

    // 노드 선택
    const selectNode = useCallback((node) => {
        setSelectedNode(node);
    }, []);

    // 노드 호버
    const hoverNode = useCallback((node) => {
        setHoveredNode(node);
    }, []);

    // 노드 호버 해제
    const unhoverNode = useCallback(() => {
        setHoveredNode(null);
    }, []);

    // Transform 모드 변경
    const changeTransformMode = useCallback((mode) => {
        setTransformMode(mode);
    }, []);

    // 노드 위치 업데이트 (히스토리 저장 없음)
    const updateNodePosition = useCallback((nodeId, newPosition) => {
        const node = findNodeById(nodeId);
        if (node) {
            node.position.set(newPosition.x, newPosition.y, newPosition.z);
            triggerObjectTransformUpdate();
        }
    }, [findNodeById, triggerObjectTransformUpdate]);

    // 노드 회전 업데이트 (히스토리 저장 없음)
    const updateNodeRotation = useCallback((nodeId, newRotation) => {
        const node = findNodeById(nodeId);
        if (node) {
            node.rotation.set(newRotation.x, newRotation.y, newRotation.z);
            triggerObjectTransformUpdate();
        }
    }, [findNodeById, triggerObjectTransformUpdate]);

    // 노드 스케일 업데이트 (히스토리 저장 없음)
    const updateNodeScale = useCallback((nodeId, newScale) => {
        const node = findNodeById(nodeId);
        if (node) {
            node.scale.set(newScale.x, newScale.y, newScale.z);
            triggerObjectTransformUpdate();
        }
    }, [findNodeById, triggerObjectTransformUpdate]);

    // 노드 가시성 토글
    const toggleNodeVisibility = useCallback((nodeId, visible) => {
        if (originalScene) {
            const findAndToggleNode = (node) => {
                if (node.uuid === nodeId) {
                    node.visible = visible;
                    return true;
                }
                
                if (node.children) {
                    for (const child of node.children) {
                        if (findAndToggleNode(child)) {
                            return true;
                        }
                    }
                }
                return false;
            };

            findAndToggleNode(originalScene);
        }

        setSceneData(prevSceneData => {
            if (!prevSceneData) return prevSceneData;

            const updateNodeVisibility = (nodes) => {
                return nodes.map(node => {
                    if (node.id === nodeId) {
                        return { ...node, visible };
                    }
                    if (node.children) {
                        return { ...node, children: updateNodeVisibility(node.children) };
                    }
                    return node;
                });
            };

            return updateNodeVisibility(prevSceneData);
        });
    }, [originalScene]);

    // 노드 색상 업데이트
    const updateNodeColor = useCallback((nodeId, newColor) => {
        const node = findNodeById(nodeId);
        if (node && node.material) {
            const color = new THREE.Color(newColor);
            if (Array.isArray(node.material)) {
                node.material.forEach(mat => mat.color.copy(color));
            } else {
                node.material.color.copy(color);
            }
        }
    }, [findNodeById]);

    // 노드 투명도 업데이트
    const updateNodeOpacity = useCallback((nodeId, newOpacity) => {
        const node = findNodeById(nodeId);
        if (node && node.material) {
            if (Array.isArray(node.material)) {
                node.material.forEach(mat => {
                    mat.opacity = newOpacity;
                    mat.transparent = newOpacity < 1;
                });
            } else {
                node.material.opacity = newOpacity;
                node.material.transparent = newOpacity < 1;
            }
        }
    }, [findNodeById]);

    return (
        <SceneContext.Provider
            value={{
                sceneData,
                originalScene,
                selectedNode,
                hoveredNode,
                transformMode,
                modes,
                objectTransformUpdate,
                history,
                currentIndex,
                updateSceneData,
                selectNode,
                hoverNode,
                unhoverNode,
                changeTransformMode,
                triggerObjectTransformUpdate,
                toggleNodeVisibility,
                updateNodePosition,
                updateNodeRotation,
                updateNodeScale,
                updateNodeColor,
                updateNodeOpacity,
                findNodeById,
                undo,
                redo,
                addToHistory,
                clearHistory
            }}
        >
            {children}
        </SceneContext.Provider>
    );
};  