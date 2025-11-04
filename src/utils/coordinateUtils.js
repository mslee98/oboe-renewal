/**
 * 아키스케치 스타일 좌표 변환 시스템
 * 
 * 핵심 개념:
 * - 논리적 단위(미터)로 데이터 저장 (실제 공간 크기)
 * - 2D 렌더링: 논리적 → 픽셀 변환
 * - 3D 렌더링: 논리적 단위 그대로 사용
 */

// 픽셀당 미터 (Pixels Per Meter)
// 2D 화면에서 1미터가 몇 픽셀로 표시되는지
export const PIXELS_PER_METER = 40;  // 기본값: 1m = 40px

// 역변환: 미터당 픽셀 (Meters Per Pixel)
export const METERS_PER_PIXEL = 1 / PIXELS_PER_METER;  // 1px = 0.025m

/**
 * 좌표 변환 클래스
 * 논리적 단위(미터) ↔ 픽셀 단위 변환
 */
export class CoordinateSystem {
  constructor(pixelsPerMeter = PIXELS_PER_METER) {
    this.ppm = pixelsPerMeter;
    this.mpp = 1 / pixelsPerMeter;
  }

  /**
   * 논리적 단위(미터) → 픽셀 (2D 렌더링용)
   * @param {Object} logical - {x, z} 논리적 좌표 (미터)
   * @returns {Object} {x, z} 픽셀 좌표
   */
  toPixel(logical) {
    return {
      x: logical.x * this.ppm,
      z: logical.z * this.ppm
    };
  }

  /**
   * 픽셀 → 논리적 단위(미터) (저장/변환용)
   * @param {Object} pixel - {x, z} 픽셀 좌표
   * @returns {Object} {x, z} 논리적 좌표 (미터)
   */
  toLogical(pixel) {
    return {
      x: pixel.x * this.mpp,
      z: pixel.z * this.mpp
    };
  }

  /**
   * 논리적 단위 → 3D 좌표 (변환 최소화)
   * 논리적 단위가 이미 미터이므로 그대로 사용
   * @param {Object} logical - {x, y?, z} 논리적 좌표
   * @returns {Object} {x, y, z} 3D 좌표
   */
  to3D(logical) {
    return {
      x: logical.x,  // 이미 미터 단위
      y: logical.y || 0,
      z: logical.z   // 이미 미터 단위
    };
  }

  /**
   * 3D 좌표 → 논리적 단위 (역변환)
   * @param {Object} world - {x, y, z} 3D 좌표
   * @returns {Object} {x, y, z} 논리적 좌표
   */
  from3D(world) {
    return {
      x: world.x,
      y: world.y,
      z: world.z
    };
  }
}

// 기본 인스턴스 (전역 사용)
export const coordinateSystem = new CoordinateSystem();

/**
 * 편의 함수들 (기존 코드 호환성 유지)
 */

/**
 * 논리적 단위 → 픽셀
 */
export const logicalToPixel = (logical) => coordinateSystem.toPixel(logical);

/**
 * 픽셀 → 논리적 단위
 */
export const pixelToLogical = (pixel) => coordinateSystem.toLogical(pixel);

/**
 * 논리적 단위 → 3D
 */
export const logicalTo3D = (logical) => coordinateSystem.to3D(logical);

/**
 * 레거시 지원: 픽셀 → 3D (마이그레이션 기간용)
 * @deprecated 논리적 단위 사용 권장
 */
export const SCALE = METERS_PER_PIXEL;  // 하위 호환성

/**
 * Three.js Vector3 생성 헬퍼 (논리적 단위 → 3D)
 */
export const createVector3FromLogical = (logical, THREE) => {
  const coords = coordinateSystem.to3D(logical);
  return new THREE.Vector3(coords.x, coords.y, coords.z);
};
