import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSidebar } from "../../context/SidebarContext";
import { Grid, OrbitControls, useGLTF, Environment, Text, useTexture, Billboard } from "@react-three/drei";
import { useTheme } from "../../context/ThemeContext";
import { Color } from 'three';
import * as THREE from 'three';
import { Canvas, useFrame } from "@react-three/fiber";

// 마커 위치 정의
const markerOptions = [
    {
        id: 1,
        name: "Okestro Park 1",
        position: [2000, 400, -680],
        color: "#4F46E5"
    },
    {
        id: 2,
        name: "Okestro Tower", 
        position: [2300, 350, -70],
        color: "#10B981"
    }
];

// 테마별 조명 설정을 컴포넌트 외부로 분리
const lightingConfig = {
    light: {
        ambient: { intensity: 0.3, color: '#ffffff' },
        directional: { 
            intensity: 0.8, 
            position: [100, 1000, 100],
            color: '#ffffff',
            shadow: true
        },
        environment: { preset: 'city', background: true, blur: 0.6 }
    },
    dark: {
        ambient: { intensity: 0.1, color: '#1a1a2e' },
        directional: { 
            intensity: 0.4, 
            position: [100, 1000, 100],
            color: '#4a90e2',
            shadow: true
        },
        environment: { preset: 'night', background: true, blur: 0.8 }
    }
};

// Pin 마커 컴포넌트 - mesh로 변경
const PinMarker = ({ position, scale = [1, 1, 1], color = 0xffffff, isHovered, onHover, onUnhover, markerName }) => {
    const { nodes: pin } = useGLTF('/models/pin4.glb');
    const pinRef = useRef();
    const [textOpacity, setTextOpacity] = useState(0);
    const [backgroundOpacity, setBackgroundOpacity] = useState(0);

    // pin 모델의 geometry와 material 정보 추출
    const pinGeometry = useMemo(() => {
        if (pin.Extrude && pin.Extrude.geometry) {
            return pin.Extrude.geometry.clone();
        }
        return null;
    }, [pin.Extrude]);

    const pinMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.7,
            metalness: 0.2
        });
    }, [color]);

    // 부드러운 스케일 애니메이션
    useFrame(() => {
        if (pinRef.current) {
            const targetScale = isHovered ? 1.5 : 3;
            const currentScale = pinRef.current.scale.x;
            const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.3);
            
            pinRef.current.scale.setScalar(newScale);
        }

        // 텍스트 투명도 애니메이션
        const targetOpacity = isHovered ? 1 : 0;
        const newOpacity = THREE.MathUtils.lerp(textOpacity, targetOpacity, 0.3);
        setTextOpacity(newOpacity);
        setBackgroundOpacity(newOpacity);
    });

    return (
        <group position={position}>
            {/* Pin을 mesh로 변경 */}
            <mesh
                ref={pinRef}
                geometry={pinGeometry}
                material={pinMaterial}
                scale={[3, 3, 3]}
                onPointerOver={onHover}
                onPointerOut={onUnhover}
                castShadow
                receiveShadow
            />

            {/* 텍스트를 Billboard로 감싸서 항상 카메라를 향하도록 */}
            <Billboard
                follow={true}
                lockX={false}
                lockY={false}
                lockZ={false}
            >
                {/* 텍스트 배경 */}
                <mesh position={[0, 40, 0]}>
                    <planeGeometry args={[120, 30]} />
                    <meshBasicMaterial 
                        color="rgba(0, 0, 0, 0.8)" 
                        transparent 
                        opacity={backgroundOpacity} 
                    />
                </mesh>
                
                {/* 텍스트 */}
                <Text
                    position={[0, 40, 1]}
                    fontSize={12}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={100}
                    textAlign="center"
                    opacity={textOpacity}
                >
                    {markerName}
                </Text>
            </Billboard>
        </group>
    );
};

const Oboe = () => {
    const [canvasHeight, setCanvasHeight] = useState("100vh");
    const [canvasWidth, setCanvasWidth] = useState("100%");
    const containerRef = useRef(null);
    const { isExpanded, isHovered, isMobileOpen } = useSidebar();
    const { theme } = useTheme();

    // useMemo로 currentLighting을 안정화
    const currentLighting = useMemo(() => {
        return theme && lightingConfig[theme] ? lightingConfig[theme] : lightingConfig.light;
    }, [theme]);

    // Environment를 고정하여 preset 변경으로 인한 리렌더링 방지
    const environmentProps = useMemo(() => ({
        preset: 'city', // 고정된 preset 사용
        background: currentLighting.environment.background,
        blur: currentLighting.environment.blur
    }), [currentLighting.environment.background, currentLighting.environment.blur]);

    // Ambient Light 설정도 useMemo로 안정화
    const ambientLightProps = useMemo(() => ({
        intensity: currentLighting.ambient.intensity,
        color: currentLighting.ambient.color
    }), [currentLighting.ambient]);

    // Directional Light 설정도 useMemo로 안정화
    const directionalLightProps = useMemo(() => ({
        position: currentLighting.directional.position,
        intensity: currentLighting.directional.intensity,
        color: currentLighting.directional.color,
        castShadow: currentLighting.directional.shadow
    }), [currentLighting.directional]);

    // Canvas 키를 고정하여 불필요한 리마운트 방지
    const canvasKey = useMemo(() => 'stable-canvas', []);

    useEffect(() => {
        const updateDimensions = () => {
            const header = document.querySelector('header');
            const sidebar = document.querySelector('aside');
            
            if (header && containerRef.current) {
                const headerHeight = header.offsetHeight;
                const headerBorder = parseInt(getComputedStyle(header).borderBottomWidth) || 0;
                const totalHeaderHeight = headerHeight + headerBorder;
                
                const newHeight = `calc(100vh - ${totalHeaderHeight}px)`;
                setCanvasHeight(newHeight);
            }

            if (sidebar) {
                const sidebarWidth = sidebar.offsetWidth;
                const sidebarBorder = parseInt(getComputedStyle(sidebar).borderRightWidth) || 0;
                const totalSidebarWidth = sidebarWidth + sidebarBorder;
                
                const isLargeScreen = window.innerWidth >= 1024;
                if (isLargeScreen && !isMobileOpen) {
                    setCanvasWidth(`calc(100vw - ${totalSidebarWidth}px)`);
                } else {
                    setCanvasWidth("100vw");
                }
            }
        };

        updateDimensions();
        
        window.addEventListener('resize', updateDimensions);
        
        const resizeObserver = new ResizeObserver(updateDimensions);
        const header = document.querySelector('header');
        const sidebar = document.querySelector('aside');
        
        if (header) resizeObserver.observe(header);
        if (sidebar) resizeObserver.observe(sidebar);
        
        return () => {
            window.removeEventListener('resize', updateDimensions);
            resizeObserver.disconnect();
        };
    }, [isExpanded, isHovered, isMobileOpen]);

    return (
        <div 
            ref={containerRef} 
            className="overflow-hidden dark:bg-gray-900" 
            style={{ 
                height: canvasHeight,
                width: canvasWidth,
                position: 'relative'
            }}
        >
            <Canvas
                key={canvasKey}
                camera={{ 
                    position: [2800, 600, -200], // 측면에서 보도록 조정
                    fov: 45, 
                    far: 3000, 
                    rotation: [-Math.PI / 4, 0, 0] // 더 완만한 각도
                }}
                gl={{ 
                    outputColorSpace: THREE.SRGBColorSpace,
                }}
                shadows
            >
                {/* Environment를 고정하여 preset 변경 방지 */}
                <Environment 
                    preset="city"
                    background={true}
                    blur={0.6}
                />

                <fog attach="fog" args={["#000000", 1000, 3000]} />

                <ambientLight {...ambientLightProps} />
                
                <directionalLight
                    {...directionalLightProps}
                    shadow-mapSize-width={1024}
                    shadow-mapSize-height={1024}
                />

                <Arround />

                <OrbitControls 
                    enablePan={true} 
                    enableZoom={true}
                    target={[2150, 0, -400]} // 타겟은 중간 지점 유지
                    minDistance={100}
                    maxDistance={2000}
                />
            </Canvas>
        </div>
    )
}

const Arround = () => {
    const [hoveredMarker, setHoveredMarker] = useState(null);
    const [selectedMarker, setSelectedMarker] = useState(null);
    
    const { nodes: buildings, materials: backgroundMaterials } = useGLTF('/models/YeouidoBuildings16.glb');
    const { nodes: landuse, materials: groundMaterials } = useGLTF('/models/YeouidoLanduse16.glb');

    const handleMarkerHover = (markerId) => {
        console.log('Hover:', markerId);
        setHoveredMarker(markerId);
    };

    const handleMarkerUnhover = () => {
        console.log('Unhover');
        setHoveredMarker(null);
    };

    const handleMarkerClick = (marker) => {
        setSelectedMarker(marker);
        console.log('Selected marker:', marker);
    };

    // 빌딩에 엣지 효과 추가
    useEffect(() => {
        if (buildings.Scene) {
            buildings.Scene.traverse((child) => {
                if (child.name.indexOf('screen') > 0) return;

                if (child.isMesh) {
                    if (child.userData.edgeLine) {
                        child.remove(child.userData.edgeLine);
                        child.userData.edgeLine.geometry.dispose();
                        child.userData.edgeLine.material.dispose();
                    }

                    child.material = new THREE.MeshStandardMaterial({
                        color: 0x888888,
                        roughness: 0.7,
                        metalness: 0.2,
                        transparent: false,
                        opacity: 1.0,
                    });

                    child.receiveShadow = true;
                    child.castShadow = true;

                    const edgeGeometry = new THREE.EdgesGeometry(child.geometry, 1);
                    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x555555, linewidth: 1 });
                    const edgeLine = new THREE.LineSegments(edgeGeometry, edgeMaterial);

                    edgeLine.position.copy(child.position);
                    edgeLine.rotation.copy(child.rotation);
                    edgeLine.scale.copy(child.scale);

                    child.add(edgeLine);
                    child.userData.edgeLine = edgeLine;
                }
            });
        }
    }, [buildings.Scene]);

    const texture = useTexture('/models/yeouidoTerrain.jpg');

    return (
        <>
            {/* Terrain */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
                <planeGeometry args={[10000, 10000, 100, 100]}  />
                <meshStandardMaterial 
                    transparent 
                    opacity={0.8}  
                    displacementMap={texture} 
                    displacementScale={200} 
                    displacementBias={-50} 
                />
            </mesh>

            <primitive object={buildings.Scene} position={[0, 0, 0]} scale={[1, 1, 1]} />
            <primitive object={landuse.Scene} position={[0, 0.01, 0]} scale={[1, 1, 1]} />

            {/* Pin 마커들 - markerName prop 추가 */}
            {markerOptions.map((marker) => (
                <PinMarker
                    key={marker.id}
                    position={marker.position}
                    scale={[3, 3, 3]}
                    color={0xffffff}
                    isHovered={hoveredMarker === marker.id}
                    onHover={() => handleMarkerHover(marker.id)}
                    onUnhover={handleMarkerUnhover}
                    markerName={marker.name} // 마커 이름 전달
                />
            ))}
        </>
    )
}

export default Oboe;