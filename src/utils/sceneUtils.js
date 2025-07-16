// Three.js Scene 객체를 씬 그래프 데이터로 변환하는 유틸리티 함수들

export const convertSceneToGraphData = (scene) => {
    if (!scene) return [];
    
    const convertNode = (node) => {
        const graphNode = {
            id: node.uuid || Math.random().toString(36).substr(2, 9),
            name: node.name || 'Unnamed',
            type: getNodeType(node),
            visible: node.visible !== false,
            renderable: true, // 기본적으로 렌더링 가능
            hasModifiers: hasModifiers(node),
            children: []
        };

        // 자식 노드들 처리
        if (node.children && node.children.length > 0) {
            graphNode.children = node.children.map(convertNode);
        }

        return graphNode;
    };

    return [convertNode(scene)];
};

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

// 모디파이어 존재 여부 확인
const hasModifiers = (node) => {
    // Three.js 객체에서 모디파이어 관련 속성 확인
    return !!(node.geometry || node.material || node.userData);
};

// 노드 가시성 토글 함수 - 콜백 함수를 받아서 상태 업데이트 트리거
export const toggleNodeVisibility = (scene, nodeId, visible, onStateChange) => {
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

    const success = findAndToggleNode(scene);
    if (success && onStateChange) {
        onStateChange(); // 상태 변경 콜백 호출
    }
    return success;
};

// 노드 찾기 함수
export const findNodeById = (scene, nodeId) => {
    const findNode = (node) => {
        if (node.uuid === nodeId) {
            return node;
        }
        
        if (node.children) {
            for (const child of node.children) {
                const found = findNode(child);
                if (found) return found;
            }
        }
        return null;
    };

    return findNode(scene);
};

// 씬 데이터를 다시 변환하는 함수 (상태 업데이트용)
export const refreshSceneData = (scene) => {
    return convertSceneToGraphData(scene);
}; 