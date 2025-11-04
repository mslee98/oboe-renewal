import { createContext, useContext, useState, useCallback } from 'react';

const ToolContext = createContext();

export const useTool = () => {
  const context = useContext(ToolContext);
  if (!context) {
    throw new Error('useTool must be used within a ToolProvider');
  }
  return context;
};

export const ToolProvider = ({ children }) => {
  const [selectedTool, setSelectedTool] = useState("cursor"); // 기본값을 cursor로 변경
  const [selectedMode, setSelectedMode] = useState("select"); // 기본값을 select로 변경
  const [drawingMode, setDrawingMode] = useState("wall"); // "wall" | "room"

  const handleToolSelect = useCallback((toolId) => {
    setSelectedTool(toolId);
    
    // 도구에 따른 그리기 모드 설정
    if (toolId === "wall-drawing") {
      setDrawingMode("wall");
      setSelectedMode("draw");
    } else if (toolId === "room-drawing") {
      setDrawingMode("room");
      setSelectedMode("draw");
    } else if (toolId === "cursor") {
      setSelectedMode("select");
    }
    
    console.log("Selected tool:", toolId, "Drawing mode:", drawingMode);
  }, [drawingMode]);

  const handleModeSelect = useCallback((modeId) => {
    setSelectedMode(modeId);
    console.log("Selected mode:", modeId);
  }, []);


  const value = {
    selectedTool,
    selectedMode,
    drawingMode,
    handleToolSelect,
    handleModeSelect
  };

  return (
    <ToolContext.Provider value={value}>
      {children}
    </ToolContext.Provider>
  );
}; 