import { useState } from "react";
import { useTool } from "../../context/ToolContext";

// 메뉴 설정 JSON
const menuConfig = {
  leftSection: {
    title: "주요 도구",
    tools: [
      {
        id: "drawing",
        name: "그리기 도구",
        icon: "cursor",
        shortcut: "V",
        hasDropdown: true,
        dropdownItems: [
          {
            id: "wall-drawing",
            name: "벽그리기",
            icon: "cursor",
            shortcut: "V"
          },
          {
            id: "room-drawing",
            name: "방그리기",
            icon: "grid",
            shortcut: "R"
          }
        ]
      },
      {
        id: "grid",
        name: "프레임 도구",
        icon: "grid",
        shortcut: "F",
        hasDropdown: true,
        dropdownItems: [
          {
            id: "frame",
            name: "Frame",
            icon: "grid",
            shortcut: "F"
          },
          {
            id: "section",
            name: "Section",
            icon: "document",
            shortcut: "⇧S"
          },
          {
            id: "slice",
            name: "Slice",
            icon: "slice",
            shortcut: "S"
          }
        ]
      },
      {
        id: "rectangle",
        name: "사각형 도구",
        icon: "rectangle",
        shortcut: "R",
        hasDropdown: true
      },
      {
        id: "pen",
        name: "펜 도구",
        icon: "pen",
        shortcut: "P",
        hasDropdown: true
      },
      {
        id: "text",
        name: "텍스트 도구",
        icon: "text",
        shortcut: "T",
        hasDropdown: true
      },
      {
        id: "circle",
        name: "원 도구",
        icon: "circle",
        shortcut: "O",
        hasDropdown: true
      },
      {
        id: "group",
        name: "그룹 도구",
        icon: "group",
        shortcut: "",
        hasDropdown: true
      }
    ]
  },
  rightSection: {
    title: "모드 도구",
    tools: [
      {
        id: "wave",
        name: "물결선 도구",
        icon: "wave",
        shortcut: "",
        hasDropdown: false
      },
      {
        id: "measure",
        name: "측정 도구",
        icon: "measure",
        shortcut: "",
        hasDropdown: false
      },
      {
        id: "code",
        name: "코드 도구",
        icon: "code",
        shortcut: "",
        hasDropdown: false
      }
    ]
  }
};

// 아이콘 컴포넌트
const IconComponent = ({ icon, size = 16 }) => {
  const icons = {
    cursor: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 2l12 12-2 2L5 4l2-2z"/>
      </svg>
    ),
    grid: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3h6v6H3V3zm0 12h6v6H3v-6zm12-12h6v6h-6V3zm0 12h6v6h-6v-6z"/>
      </svg>
    ),
    rectangle: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3h18v18H3V3z"/>
      </svg>
    ),
    pen: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
      </svg>
    ),
    text: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M2.5 4v3h5v12h3V7h5V4H2.5zM21.5 9h-9v3h3v7h3v-7h3V9z"/>
      </svg>
    ),
    circle: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10"/>
      </svg>
    ),
    group: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H17c-.8 0-1.54.37-2.01 1l-2.7 3.6V22h3zm-8-2c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 4v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 10.54 8H9c-.8 0-1.54.37-2.01 1L4.3 12.6V22h3z"/>
      </svg>
    ),
    wave: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    ),
    measure: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 2v2h6V2H9zm0 18v2h6v-2H9zm0-2v-2h6v2H9zm0-4V8h6v6H9z"/>
      </svg>
    ),
    code: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
      </svg>
    ),
    document: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
      </svg>
    ),
    slice: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
      </svg>
    ),
    dropdown: (
      <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 10l5 5 5-5z"/>
      </svg>
    )
  };

  return icons[icon] || null;
};

// 드롭다운 메뉴 컴포넌트
const DropdownMenu = ({ items, isOpen, onClose, onSelect, position = "bottom" }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute left-0 bottom-0 mb-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg min-w-[200px] z-50">
      <div className="p-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onSelect(item.id);
              onClose();
            }}
            className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <IconComponent icon={item.icon} />
              <span>{item.name}</span>
            </div>
            {item.shortcut && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{item.shortcut}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// 툴바 메뉴 컴포넌트
const ToolbarMenu = () => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const { selectedTool, selectedMode, handleToolSelect, handleModeSelect } = useTool();

  const handleToolClick = (tool) => {
    if (tool.hasDropdown) {
      setOpenDropdown(openDropdown === tool.id ? null : tool.id);
    } else {
      handleToolSelect(tool.id);
    }
  };

  const handleDropdownSelect = (toolId, itemId) => {
    handleToolSelect(itemId);
    setOpenDropdown(null);
  };

  // 선택된 도구가 드롭다운 아이템인지 확인하는 함수
  const isToolSelected = (tool) => {
    if (tool.hasDropdown && tool.dropdownItems) {
      return tool.dropdownItems.some(item => item.id === selectedTool);
    }
    return selectedTool === tool.id;
  };

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 flex items-center gap-1 shadow-lg border border-gray-200 dark:border-gray-700">
        {/* 왼쪽 섹션 - 주요 도구들 */}
        <div className="flex items-center gap-1">
          {menuConfig.leftSection.tools.map((tool) => (
            <div key={tool.id} className="relative">
              <button
                onClick={() => handleToolClick(tool)}
                className={`p-2 rounded-md transition-colors flex items-center gap-1 ${
                  isToolSelected(tool)
                    ? "bg-blue-500 text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                title={`${tool.name}${tool.shortcut ? ` (${tool.shortcut})` : ""}`}
              >
                <IconComponent icon={tool.icon} />
                {tool.hasDropdown && <IconComponent icon="dropdown" size={8} />}
              </button>

              {/* 드롭다운 메뉴 */}
              {tool.hasDropdown && tool.dropdownItems && (
                <DropdownMenu
                  items={tool.dropdownItems}
                  isOpen={openDropdown === tool.id}
                  onClose={() => setOpenDropdown(null)}
                  onSelect={(itemId) => handleDropdownSelect(tool.id, itemId)}
                />
              )}
            </div>
          ))}
        </div>

        {/* 구분선 */}
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>

        {/* 오른쪽 섹션 - 모드 도구들 */}
        <div className="flex items-center gap-1">
          {menuConfig.rightSection.tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleModeSelect(tool.id)}
              className={`p-2 rounded-md transition-colors ${
                selectedMode === tool.id
                  ? "bg-blue-500 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              title={tool.name}
            >
              <IconComponent icon={tool.icon} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ToolbarMenu; 