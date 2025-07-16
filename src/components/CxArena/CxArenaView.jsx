import { useGLTF } from '@react-three/drei'
import { useEffect, useState, useMemo } from 'react'
import * as THREE from 'three'
import { Html, Outlines } from '@react-three/drei'

const EXCLUDED_OBJECT_NAMES = [
    "Table",
    "Sofa",
    "SerRWall",
    "Door",
    "PStand",
    "Chair",
    "Desk",
    "Wall",
    "Floor",
    "Blind",
    "Exit",
    "Computer",
    "Heater",
    "SystemBox",
    "Win",
    "SlopeStep",
    "Storage"
  ];

// 렌더링할 객체들의 이름 목록
const RENDERABLE_OBJECT_NAMES = [
    "ORFloor_001",
    "offwall_001",
    "officeExit_001",
    "blindA_001",

    "SerRackA_001",
    // 필요한 객체들을 여기에 추가
];

const CxArenaView = () => {
    const { nodes, scene } = useGLTF('/models/IDC_CXARENA_V0.40.glb');
    console.log(scene)


    const [hoveredObject, setHoveredObject] = useState(null);
  
    // 제외할 객체인지 확인하는 함수
    const isExcludedObject = (objectName) => {
      return EXCLUDED_OBJECT_NAMES.some(excludedName => 
        objectName.includes(excludedName)
      );
    };

    // 렌더링할 객체인지 확인하는 함수
    const isRenderableObject = (objectName) => {
      return RENDERABLE_OBJECT_NAMES.some(renderableName => 
        objectName.includes(renderableName)
      );
    };

    // 자식 객체를 찾는 헬퍼 함수
    const findChild = (parent, targetUuid) => {
      for (let child of parent.children) {
        if (child.uuid === targetUuid) {
          return true;
        }
        if (child.children.length > 0) {
          if (findChild(child, targetUuid)) {
            return true;
          }
        }
      }
      return false;
    };

    // 클론된 객체들을 생성하는 함수
    const clonedObjects = useMemo(() => {
      if (!scene) return [];
      
      const objects = [];
      
      scene.traverse((child) => {
        if (child.name && isRenderableObject(child.name)) {
          // 객체를 깊은 복사로 클론
          const clonedObject = child.clone();
          
          // 클론된 객체의 모든 메쉬에 호버 이벤트 추가
          clonedObject.traverse((mesh) => {
            if (mesh.isMesh) {
              mesh.userData = { 
                ...mesh.userData, 
                clickable: true,
                originalParent: child.name // 원본 부모 이름 저장
              };
            }
          });
          
          objects.push({
            original: child,
            cloned: clonedObject,
            name: child.name
          });
        }
      });
      
      return objects;
    }, [scene]);
  
    // 클론된 객체들에 hover 이벤트를 부여
    useEffect(() => {
      clonedObjects.forEach(({ cloned }) => {
        cloned.traverse((child) => {
          if (child.isMesh) {
            child.onPointerOver = (e) => {
              e.stopPropagation();
              if (!isExcludedObject(child.name)) {
                setHoveredObject(child);
              }
            };
            child.onPointerOut = (e) => {
              e.stopPropagation();
              setHoveredObject(null);
            };
          }
        });
      });
    }, [clonedObjects]);
  
    // react-three-fiber에서 primitive로 넘길 때 pointer 이벤트를 직접 할당
    const handlePointerOver = (e) => {
      e.stopPropagation();
  
      if (e.object.userData.clickable) {
        if (!isExcludedObject(e.object.name)) {
          setHoveredObject(e.object);
        }
      }
    };
    
    const handlePointerOut = (e) => {
      e.stopPropagation();
      setHoveredObject(null);
    };
  
    // 클론된 객체들의 라벨을 표시하는 함수
    const renderClonedObjectLabels = () => {
      const labels = [];
  
      clonedObjects.forEach(({ cloned, name }) => {
        const worldPosition = new THREE.Vector3();
        cloned.getWorldPosition(worldPosition);
        
        // 라벨 위치를 약간 위로 조정
        worldPosition.y += 2;
        
        // 호버 상태에 따른 스타일 결정
        const isHovered = hoveredObject && (
          hoveredObject.uuid === cloned.uuid || 
          findChild(cloned, hoveredObject.uuid)
        );
        
        labels.push(
          <Html
            key={`label-${cloned.uuid}`}
            position={worldPosition}
            center
            distanceFactor={20}
            onPointerOver={() => setHoveredObject(cloned)}
            onPointerOut={() => setHoveredObject(null)}
            style={{
              cursor: isHovered ? "pointer" : "default",
              background: isHovered ? "rgba(59, 130, 246, 0.9)" : "rgba(0,0,0,0.9)",
              color: "#fff",
              padding: "4px 12px",
              borderRadius: "6px",
              fontSize: "6px",
              pointerEvents: "auto",
              whiteSpace: "nowrap",
              border: isHovered ? "1px solid rgba(59, 130, 246, 0.8)" : "1px solid rgba(255,255,255,0.5)",
              textAlign: "center",
              minWidth: "80px",
              fontWeight: "bold",
              textShadow: "0 1px 2px rgba(0,0,0,0.8)",
              transition: "all 0.2s ease-in-out"
            }}
          >
            {name}
          </Html>
        );
      });
  
      return labels;
    };
  
    return (
      <>
        <group position={[0, 0.02, 0]}>
          {/* 클론된 객체들을 개별적으로 렌더링 */}
          {clonedObjects.map(({ cloned }) => (
            <primitive
              key={cloned.uuid}
              object={cloned}
              onPointerOver={handlePointerOver}
              onPointerOut={handlePointerOut}
            />
          ))}
          
          {/* 클론된 객체들의 라벨 표시 */}
          {renderClonedObjectLabels()}
        </group>
      </>
    );
  };

  export default CxArenaView;