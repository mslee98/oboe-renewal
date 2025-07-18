import React, { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

const CameraController = ({ targetPosition = null, isZooming = false }) => {
  const { camera, controls } = useThree();
  const originalPosition = useRef(null);
  const originalTarget = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!targetPosition || !controls) return;

    // 원래 위치 저장
    if (!originalPosition.current) {
      originalPosition.current = camera.position.clone();
      originalTarget.current = controls.target.clone();
    }

    if (isZooming) {
      // 타겟 위치로 카메라 이동
      const target = new THREE.Vector3(...targetPosition);
      const distance = 3; // 확대 거리
      
      // 카메라 위치 계산 (타겟에서 약간 뒤로)
      const cameraPosition = target.clone().add(new THREE.Vector3(distance, distance, distance));
      
      // 부드러운 애니메이션
      const startPosition = camera.position.clone();
      const startTarget = controls.target.clone();
      const duration = 2000; // 2초
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 이징 함수 (부드러운 전환)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        camera.position.lerpVectors(startPosition, cameraPosition, easeProgress);
        controls.target.lerpVectors(startTarget, target, easeProgress);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      
      animate();
    } else {
      // 원래 위치로 복귀
      if (originalPosition.current && originalTarget.current) {
        const duration = 2000;
        const startTime = Date.now();
        const startPosition = camera.position.clone();
        const startTarget = controls.target.clone();

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeProgress = 1 - Math.pow(1 - progress, 3);
          
          camera.position.lerpVectors(startPosition, originalPosition.current, easeProgress);
          controls.target.lerpVectors(startTarget, originalTarget.current, easeProgress);
          
          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
          }
        };
        
        animate();
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetPosition, isZooming, camera, controls]);

  return null;
};

export default CameraController; 