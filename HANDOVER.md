# React-Oboe 프로젝트 인수인계 문서

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택 및 버전](#2-기술-스택-및-버전)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [라우팅 및 페이지](#4-라우팅-및-페이지)
5. [상태 관리(데이터)](#5-상태-관리데이터)
6. [데이터 흐름 및 사용 방식](#6-데이터-흐름-및-사용-방식)
7. [주요 기능별 설명](#7-주요-기능별-설명)
8. [실행 및 빌드](#8-실행-및-빌드)
9. [주의사항 및 알려진 이슈](#9-주의사항-및-알려진-이슈)
10. [Editor와 SceneProvider 동작](#10-editor와-sceneprovider-동작)
11. [2D Editor (Interior2ds) 동작](#11-2d-editor-interior2ds-동작)

---

## 1. 프로젝트 개요

- **프로젝트명**: react-oboe
- **성격**: React 기반 프론트엔드 애플리케이션. 3D 뷰어(Oboe/CxArena), 3D 에디터(Editor), 인테리어 2D/3D 편집(Archisketch 스타일) 등을 포함한 대시보드형 웹앱.
- **진입점**: `index.html` → `src/main.jsx` → `App.jsx` (ThemeProvider로 감싼 후 BrowserRouter 사용).

---

## 2. 기술 스택 및 버전

| 구분 | 기술 | 버전 |
|------|------|------|
| 런타임/빌드 | Node (권장 LTS) | - |
| 프레임워크 | React | ^19.1.0 |
| 라우팅 | react-router-dom | ^7.6.2 |
| 빌드 도구 | Vite | ^7.0.0 |
| 3D | three | ^0.177.0 |
| 3D React | @react-three/fiber | ^9.1.2 |
| 3D 헬퍼 | @react-three/drei | ^10.3.0 |
| 3D 후처리 | @react-three/postprocessing | ^3.0.4 |
| 2D 캔버스 | pixi.js, @pixi/react | ^8.x |
| 스타일 | Tailwind CSS | ^4.0.0 |
| 차트 | recharts | ^2.12.0 |
| 기타 | framer-motion, uuid | ^12.x, ^11.x |

- **언어**: JSX + 일부 TypeScript(타입/아이콘).
- **ESLint**: `eslint.config.js` 사용.

---

## 3. 프로젝트 구조

```
react-oboe/
├── index.html              # HTML 진입점
├── package.json
├── vite.config.js          # Vite + React SWC + SVGR
├── tailwind.config.ts
├── postcss.config.js
├── eslint.config.js
├── public/                 # 정적 자산 (그대로 복사)
│   ├── fonts/
│   ├── images/             # 에러/로고/shape 이미지
│   └── models/             # GLB/이미지 (IDC, 여의도, pin 등)
├── src/
│   ├── main.jsx            # ThemeProvider + App 마운트
│   ├── App.jsx             # 라우트 정의
│   ├── App.css / index.css
│   ├── assets/             # 커서 등 기본 에셋
│   ├── components/         # 공통/도메인별 컴포넌트
│   │   ├── common/         # AnimatedList, GridShape, NotificationList, ThemeToggle, ToolbarMenu
│   │   ├── CxArena/        # 3D CX-Arena 전용 (뷰, 마커, 차트, 대시보드 등)
│   │   ├── Editor/         # SceneGraph
│   │   ├── Interior/       # 2D/3D 벽·방·코너 (Corner, Wall, Room, Zoom 등)
│   │   └── Projects.jsx
│   ├── context/            # 전역/페이지별 상태
│   │   ├── ArchisketchContext.jsx  # 코너/벽/방 (인테리어)
│   │   ├── SceneContext.jsx       # 3D 씬/히스토리/선택
│   │   ├── SidebarContext.jsx     # 사이드바 열림/호버/모바일
│   │   ├── ThemeContext.jsx       # light/dark
│   │   └── ToolContext.jsx        # 도구/모드 (커서, 벽그리기, 방그리기)
│   ├── icons/              # SVG 아이콘 (index.ts로 export)
│   ├── layouts/
│   │   ├── AppLayout.jsx   # SidebarProvider + AppSidebar + AppHeader + Outlet
│   │   ├── AppHeader.jsx
│   │   ├── AppSidebar.jsx  # 네비게이션 메뉴
│   │   ├── EditorSidebar.jsx
│   │   └── SidebarWidget.jsx
│   ├── pages/
│   │   ├── home.jsx        # 대시보드(홈)
│   │   ├── Interior2ds.jsx
│   │   ├── Interior3DWithEditor.jsx  # Interior 3D + Editor 사이드바
│   │   ├── Oboe/
│   │   │   ├── Oboe.jsx    # 3D 지도/마커 뷰
│   │   │   ├── CxArena.jsx # CX-Arena 3D + 차트/대시보드
│   │   │   └── Editor.jsx  # GLB 로드 + Transform/Undo·Redo
│   │   └── OtherPage/
│   │       └── NotFound.jsx
│   ├── types/
│   │   └── archisketchTypes.ts   # Corner, Room, Finish, createRoom 등
│   ├── utils/
│   │   ├── coordinateUtils.js   # 논리(미터) ↔ 픽셀 ↔ 3D
│   │   └── sceneUtils.js        # 씬→그래프, 노드 찾기/가시성
│   └── svg.d.ts
└── HANDOVER.md             # 본 인수인계 문서
```

- **참고**: `src/utils/memoryUtils.js`는 git status 상 삭제된 파일로 보임. 참조하고 있다면 복구 또는 제거 정리 필요.

---

## 4. 라우팅 및 페이지

- **레이아웃**: 모든 라우트는 `AppLayout` 안에서 렌더됨 (사이드바 + 헤더 + `<Outlet />`).

| 경로 | 페이지 컴포넌트 | 설명 |
|------|-----------------|------|
| `/` | `Home` | 대시보드(카드/차트/주문 등 플레이스홀더) |
| `/oboe` | `Oboe` | 3D 여의도 맵 + 핀 마커 |
| `/cxarena` | `CxArena` | 3D CX-Arena 뷰 + 실시간 차트/서버 모니터링 |
| `/editor` | `Editor` | GLB 로드, TransformControls, Undo/Redo |
| `/interior3d-editor` | `Interior3DWithEditor` | 인테리어 3D + Archisketch + Editor 사이드바 |
| `/interior2ds` | `Interior2ds` | 인테리어 2D |
| `*` | `NotFound` | 404 |

- 사이드바 메뉴는 `AppSidebar.jsx`의 `navItems`/`othersItems`에 정의되어 있으며, 경로가 위 테이블과 다를 수 있음(예: `/Oboe` vs `/oboe`). 실제 동작은 `App.jsx` 기준으로 함.

---

## 5. 상태 관리(데이터)

- **전역(앱 공통)**  
  - **ThemeContext**: `theme` (light/dark), `toggleTheme`. `localStorage`에 저장, `document.documentElement`에 `dark` 클래스 적용.  
  - **SidebarContext**: `isExpanded`, `isHovered`, `isMobileOpen`, `activeItem`, `openSubmenu` 및 토글 함수들. 레이아웃/캔버스 너비 계산에 사용.

- **에디터/3D 씬**  
  - **SceneContext**:  
    - `sceneData` / `originalScene`: 씬 트리 데이터와 Three 씬 객체.  
    - `selectedNode`, `hoveredNode`, `transformMode`, `objectTransformUpdate`.  
    - Undo/Redo: `history`, `currentIndex`, `addToHistory`, `restoreFromHistory`, `undo`, `redo`, `clearHistory`.  
    - 노드 조작: `findNodeById`, `updateNodePosition/Rotation/Scale`, `toggleNodeVisibility`, `updateNodeColor/Opacity`, `updateSceneData`, `selectNode` 등.  
  - Editor 페이지와 Interior3D+Editor에서 `SceneProvider`로 감싸서 사용.

- **인테리어(Archisketch)**  
  - **ArchisketchContext**:  
    - `corners`, `walls`, `rooms` (코너/벽/방 데이터).  
    - 선택: `selectedCornerId`, `selectedWallId`, `selectedRoomId`, `selectedCorner`, `selectedRoom`, `selectedWall`.  
    - 코너: `addCorner`, `updateCorner`, `updateCornerPosition`, `deleteCorner`, `mergeCorners`.  
    - 벽: `addWall`, `addWallWithCorners`.  
    - 방: `addRoom`, `updateRoom`, `deleteRoom`, `detectAndCreateRooms`(벽 기준 자동 감지).  
    - 2D→3D 전환: `loadSnapshot`.  
  - 좌표는 **논리 단위(미터)**로 저장하고, `coordinateUtils`로 픽셀/3D와 변환.

- **도구(인테리어)**  
  - **ToolContext**: `selectedTool` (cursor / wall-drawing / room-drawing), `selectedMode`, `drawingMode`. `handleToolSelect`, `handleModeSelect`.

- **데이터 영속성**  
  - 테마: `localStorage` (`theme`).  
  - 인테리어: `Interior3DWithEditor`에서 `HydrateFromLocalStorage`로 로컬 스토리지에서 복원하는 로직 존재(구체 키는 해당 컴포넌트 참고).

---

## 6. 데이터 흐름 및 사용 방식

- **좌표 체계** (`src/utils/coordinateUtils.js`)  
  - **논리 단위(미터)**로 저장.  
  - 2D: 논리 → 픽셀 (`logicalToPixel`), 픽셀 → 논리 (`pixelToLogical`). `PIXELS_PER_METER = 40` 기준.  
  - 3D: 논리 단위를 그대로 Three.js 좌표로 사용 (`to3D` / `logicalTo3D`).

- **인테리어 데이터**  
  - 코너 추가 시 픽셀/논리 자동 판별 후 논리로 저장.  
  - 벽은 두 코너 ID로 연결, 길이/두께/높이 저장.  
  - 방은 벽으로 둘러싸인 영역을 `detectAndCreateRooms`로 자동 감지하거나, `addRoom`으로 수동 추가.  
  - 타입/생성 함수: `src/types/archisketchTypes.ts` (Corner, Room, createRoom, calculateArea, calculateInnerPoints 등).

- **3D 씬 데이터**  
  - `sceneUtils.js`: Three 씬 → 트리 구조 (`convertSceneToGraphData`), 노드 찾기/가시성 토글.  
  - SceneContext는 실제 Three 객체(`originalScene`)와 트리용 데이터(`sceneData`)를 함께 두고, Undo/Redo 시 노드 position/rotation/scale을 복원.

- **페이지별 Provider 구성**  
  - **Editor**: `SceneProvider` 만 사용.  
  - **Interior3DWithEditor**: `SceneProvider` → `ArchisketchProvider` → `ToolProvider` 순으로 중첩.

---

## 7. 주요 기능별 설명

- **Home (`/`)**  
  - 대시보드 UI만 존재. Customers/Orders/Monthly Target, Monthly Sales/Statistics 차트, Recent Orders 등은 플레이스홀더/하드코딩 값.

- **Oboe (`/oboe`)**  
  - React Three Fiber Canvas, 여의도 GLB + 지형 텍스처, 핀 마커(pin4.glb).  
  - 테마에 따라 조명 설정 분기(ThemeContext).  
  - 헤더/사이드바 높이·너비에 맞춰 캔버스 크기 계산(SidebarContext).

- **CxArena (`/cxarena`)**  
  - 3D 뷰(`CxArenaView`) + 실시간 차트(`RealTimeCharts`) + 알림(`NotificationList`) + 서버 모니터 대시보드(`ServerMonitoringDashboard`).  
  - GLB 모델(IDC 등) 사용.

- **Editor (`/editor`)**  
  - GLB 로드, TransformControls(이동/회전/스케일), Gizmo, Undo/Redo(히스토리 20개).  
  - SceneContext로 씬/선택/히스토리 관리, SceneGraph 등.

- **Interior 2D/3D**  
  - 2D: `Interior2ds`.  
  - 3D+에디터: `Interior3DWithEditor`에서 `Interior3D` + `EditorSidebar`, ArchisketchContext로 코너/벽/방 편집, ToolContext로 커서/벽/방 그리기 모드.

---

## 8. 실행 및 빌드

```bash
# 의존성 설치
npm install

# 개발 서버 (HMR)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview

# 린트
npm run lint
```

- 개발 시 `vite`가 사용하는 기준 디렉터리는 프로젝트 루트. `public/` 내 `models/`, `images/` 등은 `/models/...`, `/images/...`로 접근.

---

## 9. 주의사항 및 알려진 이슈

- **삭제된 파일**: `src/utils/memoryUtils.js`가 삭제된 상태로 보임. 다른 파일에서 import하고 있으면 복구하거나 참조 제거 필요.
- **경로 대소문자**: 사이드바 링크(`/Oboe` 등)와 `App.jsx` 라우트(`/oboe`)가 다를 수 있음. 일치시키는 것이 좋음.
- **Context 의존성**: Editor는 SceneContext만, Interior3D+Editor는 Scene + Archisketch + Tool 순서로 Provider 중첩. 순서 바꾸면 안 됨.
- **인테리어 Room 감지**: 벽 변경 시 `useEffect`로 100ms 지연 후 `detectAndCreateRooms` 호출. 벽이 0개면 rooms 전부 제거.
- **히스토리**: SceneContext는 최대 20개(`MAX_HISTORY_SIZE`). 넘으면 오래된 항목부터 제거.

---

## 10. Editor와 SceneProvider 동작

Editor 페이지(`/editor`)는 **SceneProvider** 하나로 전체를 감싼 뒤, 그 안에서 캔버스·사이드바·Undo/Redo·Transform을 공유합니다.  
아래는 컴포넌트 구성과 SceneContext 사용 방식, 데이터 흐름을 정리한 인수인계용 설명입니다.

### 10.1 컴포넌트 계층

```
Editor (페이지)
└── SceneProvider
    └── EditorContent
        ├── [DOM] 캔버스 영역 (Canvas 래퍼)
        │   ├── HistoryControls      ← useScene(): undo, redo, history, currentIndex, clearHistory
        │   ├── TransformModeControls ← useScene(): transformMode, modes, changeTransformMode, selectedNode, findNodeById
        │   └── Canvas (R3F)
        │       ├── EditorView        ← useScene(): updateSceneData, selectedNode, findNodeById, sceneData
        │       │   ├── GLB 씬 (primitive), Grid, Light
        │       │   └── CanvasClickHandler ← useScene(): selectNode, isTransformEnding
        │       ├── Controls          ← useScene(): selectedNode, transformMode, modes, updateNode*, addToHistory, setIsTransformEnding
        │       │   ├── TransformControls (선택 객체에 부착)
        │       │   └── OrbitControls
        │       └── GizmoHelper / GizmoViewport
        └── EditorSidebar            ← useScene(): sceneData, selectedNode, findNodeById, updateNode*, toggleNodeVisibility, …
            └── SceneGraph 등
```

- **SceneProvider**는 Editor에서 최상위에만 한 번 쓰입니다. `EditorContent`, `EditorSidebar`, Canvas 안의 모든 컴포넌트가 동일한 `useScene()` 컨텍스트를 사용합니다.

### 10.2 SceneProvider가 담당하는 것

**SceneContext** (`src/context/SceneContext.jsx`)는 다음을 제공합니다.

| 구분 | 상태/함수 | 용도 |
|------|-----------|------|
| **씬 데이터** | `sceneData`, `originalScene` | 씬 트리(UI용)와 실제 Three.js 씬 객체. Editor는 GLB 로드 후 한 번만 `updateSceneData`로 세팅. |
| **선택** | `selectedNode`, `selectNode` | 현재 선택된 노드 정보(id, name, type, position, rotation, scale). 캔버스 클릭/사이드바에서 공유. |
| **Transform 모드** | `transformMode`, `modes`, `changeTransformMode` | 0=이동, 1=회전, 2=스케일. TransformControls와 TransformModeControls에서 사용. |
| **노드 조회/수정** | `findNodeById`, `updateNodePosition`, `updateNodeRotation`, `updateNodeScale` | `originalScene` 트리에서 uuid로 객체 찾기, position/rotation/scale 직접 반영(히스토리 없음). |
| **히스토리** | `history`, `currentIndex`, `addToHistory`, `restoreFromHistory`, `undo`, `redo`, `clearHistory` | Undo/Redo용. 최대 20개, `type: 'initial'`(로드 시점)과 `type: 'transform'`(변형 종료 시) 저장. |
| **트랜스폼 종료 플래그** | `isTransformEnding`, `setIsTransformEnding` | Transform 종료 직후 클릭이 “선택”으로 잡히지 않도록 할 때 사용. |
| **기타** | `objectTransformUpdate`, `toggleNodeVisibility`, `updateNodeColor`, `updateNodeOpacity` | 사이드바에서 속성 변경 시 3D 반영, 리렌더 트리거 등. |

- **실제 3D 상태**는 항상 `originalScene` 안의 Three 객체(position/rotation/scale)에 있습니다.  
- **sceneData**는 사이드바의 씬 그래프·가시성 토글 등 UI용 트리 구조입니다.

### 10.3 Editor 쪽 동작 흐름

1. **진입·씬 로드**  
   - `EditorView`에서 `useGLTF("/models/IDC_CXARENA_V0.40.glb")`로 GLB 로드.  
   - `useEffect`에서 `modelScene`을 트리 구조로 변환한 뒤 `updateSceneData(sceneData, modelScene)` 호출.  
   - SceneProvider는 `sceneData`/`originalScene`을 세팅하고, 모든 mesh/group의 초기 position/rotation/scale을 `type: 'initial'`로 히스토리에 넣습니다.

2. **선택**  
   - `CanvasClickHandler`가 캔버스 클릭 시 Raycaster로 교차 객체를 찾고, “모델 씬의 직접 자식”까지 올라간 뒤 그 객체의 uuid/name/position 등으로 `selectNode(nodeInfo)` 호출.  
   - Transform이 막 끝난 직후에는 `window.setTransformEndingRef(true)`로 클릭을 무시합니다.  
   - `Controls`는 `selectedNode.id`로 `scene.getObjectByProperty('uuid', selectedNode.id)` 해서 Three 객체를 찾고, 그 객체에 `TransformControls`를 붙입니다.

3. **Transform(이동/회전/스케일)**  
   - `TransformModeControls`에서 모드(translate/rotate/scale)를 바꾸면 `changeTransformMode(index)`로 `transformMode`만 변경.  
   - 사용자가 Gizmo로 드래그하는 동안 `Controls`의 `onChange`에서 `updateNodePosition/Rotation/Scale`만 호출 → Three 객체만 바뀌고 히스토리는 건드리지 않음.  
   - `onMouseUp`(트랜스폼 종료) 시 `handleTransformEnd`에서 변경 전/후 상태를 비교해, 바뀐 경우에만 `addToHistory({ type: 'transform', nodeId, beforeState, afterState })` 호출.

4. **Undo / Redo**  
   - `HistoryControls`와 전역 단축키(Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y)에서 `undo()` / `redo()` 호출.  
   - `undo`: `currentIndex`를 하나 줄이고, 그 인덱스의 히스토리 항목에 맞춰 `restoreFromHistory(index)` 실행.  
   - `restoreFromHistory`: `type: 'initial'`이면 해당 states 전체를, `type: 'transform'`이면 해당 노드만 `findNodeById`로 찾아 position/rotation/scale을 복원.  
   - **주의**: Undo/Redo 시 “복원할 상태”는 인덱스에 따라 SceneContext가 해석합니다. Undo는 “이전 인덱스 상태로 되돌리기”, Redo는 “다음 인덱스 상태로 되돌리기”입니다.

5. **EditorSidebar**  
   - `sceneData`를 `SceneGraph`에 넘겨 트리 UI를 그림.  
   - `selectedNode`가 있으면 해당 노드를 `findNodeById`로 찾아 position/rotation/scale/color/opacity를 폼에 채우고, 사용자가 입력하면 `updateNodePosition` 등으로 바로 반영.  
   - 가시성 토글은 `toggleNodeVisibility`로 `originalScene`과 `sceneData` 둘 다 갱신합니다.

### 10.4 정리

- **Editor** = SceneProvider로 한 번 감싼 뒤, 그 안에서 GLB 씬 로드·선택·Transform·Undo/Redo·사이드바 속성 편집을 모두 **SceneContext 한 곳**으로 공유.  
- **실제 3D 상태**는 `originalScene`(Three 씬)에만 있고, **sceneData**는 트리/UI용.  
- **히스토리**는 “로드 시점(initial)” + “Transform 종료 시점(transform)”만 저장하며, 최대 20개.  
- Transform 종료 직후 클릭으로 선택이 바뀌지 않도록 하기 위해 `isTransformEnding`/`setIsTransformEnding`과 `window.setTransformEndingRef`를 함께 사용합니다.

---

## 11. 2D Editor (Interior2ds) 동작

2D Editor는 **인테리어 평면도**를 그리는 페이지입니다. 경로는 `/interior2ds`.  
코너(점)를 찍고, 두 코너를 잇는 **벽**을 그리면, 벽으로 둘러싸인 영역이 자동으로 **방(Room)**으로 감지됩니다.  
2D 캔버스는 **PixiJS**(@pixi/react)로 구현되어 있고, 2D/3D 전환 버튼으로 같은 데이터를 3D 뷰(Interior3D + EditorSidebar)에서 볼 수 있습니다.

### 11.1 컴포넌트 계층

```
Interior2ds (페이지)
└── ArchisketchProvider
    └── ToolProvider
        └── Interior2dsContent
            ├── [2D 모드] PixiCanvas (PixiJS Application)
            │   ├── useZoomPan() → 줌/팬 상태 (scale, position)
            │   ├── pixiContainer (줌/팬 적용)
            │   │   ├── 배경 레이어 (클릭: 커서=팬, 벽그리기=코너/벽 생성)
            │   │   ├── PixiGrid
            │   │   ├── Room 렌더링 (폴리곤 채우기 + 테두리)
            │   │   ├── Wall 렌더링 (선 + 길이 라벨)
            │   │   ├── Wall2DDragOverlay (벽 드래그로 이동)
            │   │   ├── CornerComponent (코너 원형 + 클릭 시 벽 그리기 연동)
            │   │   ├── VirtualCornerOverlay (커서 모드일 때만, 코너 드래그/병합)
            │   │   ├── 미리보기 라인 + 다음 포인트 미리보기 (벽 그리기 중)
            │   │   └── 디버그 텍스트 (모드, 줌, 안내)
            │   └── (Application 루트)
            ├── [3D 모드] SceneProvider → Interior3D + EditorSidebar
            ├── 2D/3D 토글 버튼 (하단)
            └── ToolbarMenu (2D일 때만: 커서, 벽 그리기 등)
```

- **2D 모드**: ArchisketchProvider + ToolProvider 안에서만 동작. SceneProvider는 사용하지 않음.
- **3D 모드**: "3D" 버튼 클릭 시 같은 corners/walls/rooms 데이터를 유지한 채 SceneProvider를 올리고 Interior3D + EditorSidebar를 렌더링.

### 11.2 사용하는 Context와 역할

| Context | 제공 항목 | 2D Editor에서의 용도 |
|----------|-----------|----------------------|
| **ArchisketchContext** | corners, walls, rooms, addCorner, addWallWithCorners, updateCorner, updateCornerPosition, deleteCorner, mergeCorners, detectAndCreateRooms, getCornerById 등 | 평면도 데이터 전부. 코너 추가/이동/병합, 벽 추가, 방 자동 감지. |
| **ToolContext** | selectedTool(cursor / wall-drawing / room-drawing), selectedMode(draw / select), drawingMode, handleToolSelect, handleModeSelect | 커서 모드(팬·코너 드래그) vs 벽 그리기 모드 구분. 툴바에서 선택. |
| **SidebarContext** | isExpanded, isHovered, isMobileOpen | 캔버스 영역 너비/높이 계산(헤더·앱 사이드바 기준). |

- **좌표**: 모든 건축 데이터(corners, walls, rooms)는 **논리 단위(미터)**로 저장.  
  - 2D 화면에는 `logicalToPixel`로 변환해 픽셀 좌표로 그리기.  
  - 클릭/드래그 등 입력은 픽셀 → `pixelToLogical`로 변환 후 ArchisketchContext에 반영.  
- **Room**: 사용자가 직접 추가하지 않음. ArchisketchContext의 `useEffect`가 walls 변경 시 100ms 뒤 `detectAndCreateRooms()`를 호출해, 벽으로 완전히 둘러싸인 폐곡선을 찾아 rooms 상태를 갱신.

### 11.3 데이터와 좌표

- **저장 단위**: Corner position은 `{ x, y, z }` 논리(미터). y는 2D에서는 보통 0.  
- **스냅**: 클릭/드래그 시 `snapToGridOrCorner`로 처리.  
  - 먼저 기존 코너 근처(threshold 논리 단위)인지 보고, 코너면 그 코너에 스냅.  
  - 아니면 픽셀 그리드(기본 40px)에 스냅 후, 픽셀 값을 `pixelToLogical`해 논리 좌표로 새 코너 생성 또는 벽 연결.  
- **Pixi 좌표**: 줌/팬이 적용된 컨테이너가 있으므로, 클릭 시 `zoomPanContainerRef.current.toLocal(globalPoint)`로 컨테이너 로컬(픽셀) 좌표로 변환한 뒤 스냅·addCorner 등에 사용.

### 11.4 동작 흐름

1. **진입**  
   - Interior2ds는 ArchisketchProvider → ToolProvider → Interior2dsContent 순으로 마운트.  
   - 기본은 2D 모드(is2D true). PixiCanvas가 Application을 만들고, useZoomPan으로 scale/position 상태를 관리.

2. **벽 그리기 모드 (wall-drawing + draw)**  
   - ToolbarMenu에서 "벽 그리기" 선택 시 selectedTool = "wall-drawing", selectedMode = "draw".  
   - 배경 또는 코너를 클릭하면 handleStageClick 실행.  
   - 첫 클릭: 스냅된 기존 코너가 있으면 그 코너를, 없으면 스냅된 픽셀 위치에 addCorner 호출(픽셀은 pixelToLogical 후 저장). 시작 코너로 두고 isDrawing = true.  
   - 마우스 이동 시 handleStageMouseMove에서 previewPoint·snappedCorner 갱신(다음 점이 그리드/코너에 스냅된 위치).  
   - 두 번째 클릭: 끝 코너(기존 또는 새로 생성)를 정하고 addWallWithCorners(startCorner, endCorner) 호출. 벽이 추가되면 ArchisketchContext의 useEffect가 detectAndCreateRooms를 실행해 방이 생김.  
   - 연속 그리기: 끝점을 새 시작점으로 두고 다시 isDrawing 유지. ESC로 연속 그리기 해제.  
   - 기존 코너를 클릭해 시작/끝으로 쓸 수도 있고, CornerComponent에서 코너 클릭 시 onCornerClick으로 같은 로직(시작점 설정 또는 벽 생성) 실행.

3. **커서 모드 (cursor)**  
   - 배경 드래그: 배경 레이어 onPointerDown에서 zoomPanState의 setIsDragging, setDragStart 등으로 팬(이동).  
   - 코너 드래그: VirtualCornerOverlay가 커서 모드일 때만 렌더됨. 코너를 드래그하면 updateCorner로 위치 갱신. 다른 코너와 겹치면 mergeCorners로 병합 가능.  
   - 벽 드래그: Wall2DDragOverlay가 벽 중앙 근처 드래그를 받아, 벽 양끝 코너를 함께 이동(updateCornerPosition). 연결된 벽들 미리보기도 갱신.

4. **줌/팬**  
   - 휠: useZoomPan 내부에서 캔버스 위 휠 이벤트로 scale만 변경(전역 이벤트 리스너).  
   - 팬: 커서 모드에서 배경 포인터 다운/이동/업으로 position 변경.  
   - 줌/팬 컨테이너에 scale·position이 적용되어 있으므로, 그 안의 모든 건축 요소(방, 벽, 코너)가 함께 확대/이동됨. 벽 길이 라벨은 invScale로 보정해 화면에서 고정 크기처럼 보이게 함.

5. **2D → 3D 전환**  
   - "3D" 버튼 클릭 시 handle3DClick 또는 handleOpen3DEditorPanel.  
   - handle3DClick: setIs2D(false)만 하면 같은 Provider 안에서 Interior2dsContent가 3D 영역(SceneProvider + Interior3D + EditorSidebar)을 렌더링. corners/walls/rooms는 그대로라서 3D에서 같은 평면도가 보임.  
   - "3D 에디터(패널 포함)"로 가는 경우: corners, walls, rooms를 snapshot으로 JSON 만들어 localStorage에 'floorplanSnapshot'으로 저장한 뒤 navigate('/interior3d-editor'). Interior3DWithEditor 쪽에서 이 스냅샷을 로드해 ArchisketchContext에 주입할 수 있음.

6. **요약**  
   - 2D Editor = ArchisketchProvider + ToolProvider + PixiJS 캔버스.  
   - 데이터는 전부 ArchisketchContext(corners, walls, rooms). 좌표는 논리(미터), 화면은 픽셀 변환(coordinateUtils).  
   - 툴은 ToolContext(커서 vs 벽 그리기). 벽 그리기는 두 번 클릭으로 코너–코너 벽 추가, Room은 벽 변경 시 자동 감지.  
   - 2D/3D 전환 시 같은 데이터로 3D 뷰 또는 별도 페이지(interior3d-editor)에서 이어서 편집 가능.

---

*문서 작성일: 2026-02-06*
