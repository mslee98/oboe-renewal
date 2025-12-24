import React, { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, TransformControls, PivotControls, Html, useCursor, Outlines } from '@react-three/drei';
import { useArchisketch } from '../../context/ArchisketchContext';
import { useScene } from '../../context/SceneContext';
import Corner3D from './Corner3D';
import Walls3D from './Walls3D';
import Room3D from './Room3D';
import * as THREE from 'three';

// 씬 그래프를 업데이트하는 컴포넌트
const SceneGraphUpdater = ({ corners, walls, rooms }) => {
  const { scene } = useThree();
  const { updateSceneData } = useScene();
  const hasInitializedRef = useRef(false);

  // 노드 타입 판별 함수
  const getNodeType = (node) => {
    if (node.isScene) return 'scene';
    if (node.isGroup) return 'collection';
    if (node.isMesh) return 'mesh';
    if (node.isLight) return 'light';
    if (node.isCamera) return 'camera';
    if (node.isObject3D) return 'object';
    // floorPlan 요소들
    if (node.userData?.type === 'room') return 'room';
    if (node.userData?.type === 'wall') return 'wall';
    if (node.userData?.type === 'corner') return 'corner';
    return 'unknown';
  };

  useEffect(() => {
    if (!scene) return;

    // 씬이 준비되면 씬 그래프 데이터 생성
    const updateSceneGraph = () => {
      const convertSceneToGraphData = (scene) => {
        if (!scene) return [];
        
        const convertNode = (node) => {
          // 조명, 카메라, 그리드는 제외
          if (node.isLight || node.isCamera || node.name === 'Grid') {
            return null;
          }

          const graphNode = {
            id: node.uuid,
            name: node.name || node.userData?.name || 'Unnamed',
            type: getNodeType(node),
            visible: node.visible !== false,
            renderable: true,
            hasModifiers: !!(node.geometry || node.material || node.userData),
            children: []
          };

          if (node.children && node.children.length > 0) {
            const childNodes = node.children
              .map(convertNode)
              .filter(Boolean); // null 제거
            graphNode.children = childNodes;
          }

          return graphNode;
        };

        return [convertNode(scene)];
      };

      const sceneData = convertSceneToGraphData(scene);
      updateSceneData(sceneData, scene);
    };

    // 초기화는 한 번만
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      // 씬이 완전히 로드될 때까지 대기
      setTimeout(updateSceneGraph, 100);
    } else {
      // 이후에는 씬이 변경될 때마다 업데이트
      updateSceneGraph();
    }
  }, [scene, corners, walls, rooms, updateSceneData]);

  return null;
};

// Canvas 클릭 이벤트를 처리하는 컴포넌트
const CanvasClickHandler = () => {
  const { camera, scene } = useThree();
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const { selectNode, isTransformEnding } = useScene();
  const [hoveredObject, setHoveredObject] = useState(null);
  
  // 즉시적인 트랜스폼 종료 상태를 위한 ref
  const isTransformEndingRef = useRef(false);

  // TransformControls 관련 요소인지 확인하는 함수
  const isTransformControlsElement = (object) => {
    let current = object;
    while (current.parent) {
      if (current.type === 'TransformControls' || 
          current.name.includes('TransformControls') ||
          current.type === 'TransformControlsPlane' ||
          current.type === 'TransformControlsGizmo') {
        return true;
      }
      current = current.parent;
    }
    return false;
  };

  // 노드 타입 판별 함수
  const getNodeType = (node) => {
    if (node.isScene) return 'scene';
    if (node.isGroup) return 'collection';
    if (node.isMesh) return 'mesh';
    if (node.isLight) return 'light';
    if (node.isCamera) return 'camera';
    if (node.isObject3D) return 'object';
    // floorPlan 요소들
    if (node.userData?.type === 'room') return 'room';
    if (node.userData?.type === 'wall') return 'wall';
    if (node.userData?.type === 'corner') return 'corner';
    return 'unknown';
  };

  // 마우스 이동 이벤트 핸들러
  const handleCanvasMouseMove = useCallback((event) => {
    const rect = event.target.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const intersects = raycasterRef.current.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      const validIntersect = intersects.find(intersect => 
        !isTransformControlsElement(intersect.object)
      );
      
      if (validIntersect) {
        setHoveredObject(validIntersect.object);
      } else {
        setHoveredObject(null);
      }
    } else {
      setHoveredObject(null);
    }
  }, [camera, scene]);

  const handleCanvasClick = useCallback((event) => {
    if (isTransformEndingRef.current) {
      return;
    }

    const rect = event.target.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const intersects = raycasterRef.current.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      const validIntersect = intersects.find(intersect => 
        !isTransformControlsElement(intersect.object)
      );
      
      if (validIntersect) {
        const selectedObject = validIntersect.object;
        
        const nodeInfo = {
          id: selectedObject.uuid,
          name: selectedObject.name || 'Unnamed',
          type: getNodeType(selectedObject),
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

        selectNode(nodeInfo);
      }
    } else {
      selectNode(null);
    }
  }, [camera, scene, selectNode]);

  // 전역에서 트랜스폼 종료 상태를 설정할 수 있도록 window 객체에 함수 등록
  useEffect(() => {
    window.setTransformEndingRef = (ending) => {
      isTransformEndingRef.current = ending;
    };
    return () => {
      delete window.setTransformEndingRef;
    };
  }, []);

  // Canvas에 이벤트 리스너 추가
  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('click', handleCanvasClick);
      canvas.addEventListener('mousemove', handleCanvasMouseMove);
      
      return () => {
        canvas.removeEventListener('click', handleCanvasClick);
        canvas.removeEventListener('mousemove', handleCanvasMouseMove);
      };
    }
  }, [handleCanvasClick, handleCanvasMouseMove]);

  // 호버 라벨 렌더링
  if (!hoveredObject) return null;

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
      <div className="px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg border backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 text-gray-900 dark:text-gray-100 border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
          <span className="font-semibold">
            {hoveredObject.name || 'Unnamed Object'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300">
            {getNodeType(hoveredObject)}
          </span>
        </div>
      </div>
    </Html>
  );
};

// TransformControls를 관리하는 컴포넌트
const Controls = () => {
  const { scene } = useThree();
  const { 
    selectedNode, 
    transformMode, 
    modes, 
    updateNodePosition, 
    updateNodeRotation,
    updateNodeScale,
    addToHistory,
    setIsTransformEnding
  } = useScene();
  const [selectedObject, setSelectedObject] = useState(null);
  const [isTransformActive, setIsTransformActive] = useState(false);
  const [initialTransformState, setInitialTransformState] = useState(null);
  const transformControlsRef = useRef(null);
  const orbitControlsRef = useRef(null);

  useCursor(isTransformActive ? 'grabbing' : 'default');

  useEffect(() => {
    if (selectedNode) {
      const node = scene.getObjectByProperty('uuid', selectedNode.id);
      setSelectedObject(node);
    } else {
      setSelectedObject(null);
    }
  }, [selectedNode, scene]);

  const handleTransformStart = () => {
    setIsTransformActive(true);
    setIsTransformEnding(false);
    
    if (window.setTransformEndingRef) {
      window.setTransformEndingRef(false);
    }
    
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = false;
    }

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
  };

  const handleTransformEnd = () => {
    if (window.setTransformEndingRef) {
      window.setTransformEndingRef(true);
    }
    
    setIsTransformActive(false);
    
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = true;
    }
    
    setTimeout(() => {
      if (window.setTransformEndingRef) {
        window.setTransformEndingRef(false);
      }
    }, 500);
    
    // Transform이 끝날 때 히스토리 저장
    if (selectedObject && selectedNode && initialTransformState) {
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
        addToHistory({
          type: 'transform',
          nodeId: selectedNode.id,
          beforeState: initialTransformState,
          afterState: finalState,
          timestamp: Date.now()
        });
      }
      
      setInitialTransformState(null);
    }
  };

  const handleTransformChange = () => {
    if (selectedObject && selectedNode && isTransformActive) {
      // 벽이나 룸의 경우 y축 고정
      const isWallOrRoom = selectedObject.userData?.type === 'wall' || selectedObject.userData?.type === 'room';
      
      if (isWallOrRoom && initialTransformState) {
        // y축을 초기값으로 고정
        selectedObject.position.y = initialTransformState.position.y;
      }

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

  // 벽이나 룸인지 확인
  const isWallOrRoom = selectedObject?.userData?.type === 'wall' || selectedObject?.userData?.type === 'room';

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
          size={1.2}
          showX={true}
          showY={!isWallOrRoom} // 벽과 룸은 Y축 숨김
          showZ={true}
          translationLimits={isWallOrRoom ? {
            minY: selectedObject.position.y,
            maxY: selectedObject.position.y
          } : undefined}
        />
      )}

      <OrbitControls 
        ref={orbitControlsRef}
        makeDefault
        enablePan={!isTransformActive}
        enableZoom={!isTransformActive}
        enableRotate={!isTransformActive}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={5}
        maxDistance={200}
      />
    </>
  );
};

const Interior3D = () => {
  const { corners, walls, rooms } = useArchisketch();

  return (
    <div className="w-full h-full relative overflow-hidden">
      <Canvas
        shadows
        camera={{
          position: [30, 30, 30], // 더 가까운 위치에서 시작
          fov: 60,
          near: 0.1,
          far: 5000
        }}
        style={{ background: 'linear-gradient(to bottom, #e5f3ff 0%, #f8fafc 100%)' }}
      >
        <Suspense fallback={null}>
          {/* 씬 그래프 업데이터 */}
          <SceneGraphUpdater corners={corners} walls={walls} rooms={rooms} />
          
          {/* 조명 */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[50, 100, 50]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          
          {/* 그리드 바닥 */}
          <Grid
            position={[0, -1, 0]}
            args={[200, 200]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#e2e8f0"
            sectionSize={10}
            sectionThickness={1}
            sectionColor="#cbd5e1"
            fadeDistance={100}
            fadeStrength={1}
          />

          {/* 룸들 렌더링 */}
          {rooms.map(room => {
            const roomCorners = room.corners.map(cornerId => 
              corners.find(c => c.archiId === cornerId)
            ).filter(Boolean);
            
            return (
              <Room3D 
                key={room.archiId} 
                room={room} 
                corners={corners}
              />
            );
          })}

          {/* 벽들 렌더링 - 모든 코너를 연결한 경로를 따라 돌출 */}
          <Walls3D walls={walls} corners={corners} />

          {/* 코너들 렌더링 (구체 제거) */}
          {/* {corners.map(corner => (
            <Corner3D key={corner.archiId} corner={corner} />
          ))} */}

          {/* Canvas 클릭 핸들러 */}
          <CanvasClickHandler />

          {/* TransformControls 및 OrbitControls */}
          <Controls />
        </Suspense>
      </Canvas>

      {/* 3D 컨트롤 가이드 */}
      <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-800/90 rounded-lg p-3 shadow-lg">
        <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          3D 뷰 컨트롤
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div>• 드래그: 회전</div>
          <div>• 휠: 줌</div>
          <div>• 우클릭: 팬</div>
        </div>
      </div>

      {/* 통계 */}
      <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 rounded-lg p-3 shadow-lg">
        <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          건축 요소
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div>코너: {corners.length}개</div>
          <div>벽: {walls.length}개</div>
          <div>방: {rooms.length}개</div>
        </div>
      </div>
    </div>
  );
};

export default Interior3D; 