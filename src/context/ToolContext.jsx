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
  const [selectedTool, setSelectedTool] = useState("wall-drawing");
  const [selectedMode, setSelectedMode] = useState("draw"); // "measure"에서 "draw"로 변경
  const [drawingMode, setDrawingMode] = useState("wall"); // "wall" | "room"

  const handleToolSelect = useCallback((toolId) => {
    setSelectedTool(toolId);
    
    // 도구에 따른 그리기 모드 설정
    if (toolId === "wall-drawing") {
      setDrawingMode("wall");
    } else if (toolId === "room-drawing") {
      setDrawingMode("room");
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
    handleToolSelect,
    handleModeSelect
  };

  return (
    <ToolContext.Provider value={value}>
      {children}
    </ToolContext.Provider>
  );
}; 