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

    // 씬 데이터 설정
    const updateSceneData = useCallback((newSceneData, newOriginalScene) => {
        setSceneData(newSceneData);
        setOriginalScene(newOriginalScene);
    }, []);

    // 노드 선택 (씬 그래프에서)
    const selectNode = useCallback((node) => {
        console.log('selectNode called with:', node);
        setSelectedNode(node);
    }, []);

    // 노드 가시성 토글 - 씬 그래프 상태도 함께 업데이트
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

        // 씬 그래프 상태도 업데이트
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

    // 노드 위치 업데이트
    const updateNodePosition = useCallback((nodeId, newPosition) => {
        const node = findNodeById(nodeId);
        if (node) {
            node.position.set(newPosition.x, newPosition.y, newPosition.z);
        }
    }, [findNodeById]);

    // 노드 회전 업데이트
    const updateNodeRotation = useCallback((nodeId, newRotation) => {
        const node = findNodeById(nodeId);
        if (node) {
            node.rotation.set(newRotation.x, newRotation.y, newRotation.z);
        }
    }, [findNodeById]);

    // 노드 스케일 업데이트
    const updateNodeScale = useCallback((nodeId, newScale) => {
        const node = findNodeById(nodeId);
        if (node) {
            node.scale.set(newScale.x, newScale.y, newScale.z);
        }
    }, [findNodeById]);

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
                updateSceneData,
                selectNode,
                toggleNodeVisibility,
                updateNodePosition,
                updateNodeRotation,
                updateNodeScale,
                updateNodeColor,
                updateNodeOpacity,
                findNodeById
            }}
        >
            {children}
        </SceneContext.Provider>
    );
};  