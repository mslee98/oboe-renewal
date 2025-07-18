import { useState, useEffect } from "react";
import { useGLTF, Grid, OrbitControls } from "@react-three/drei";
import ServerMarkers from "./ServerMarkers";

const CxArenaView = () => {
  const { scene:originalScene } = useGLTF("/models/IDC_CXARENA_V0.40.glb");
  const [modelScene, setModelScene] = useState(null);

  useEffect(() => {
    if (originalScene) {
      setModelScene(originalScene);
    }
  }, [originalScene]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={2} />
      <Grid position={[0, -0.05, 0]} args={[20, 20]} />
      
      {/* 기존 모델 렌더링 */}
      {modelScene && (
        <primitive object={modelScene} />
      )}
      
      {/* 서버 마커들 */}
      {modelScene && (
        <ServerMarkers modelScene={modelScene} />
      )}

      <OrbitControls 
          makeDefault
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
  );
};

export default CxArenaView;