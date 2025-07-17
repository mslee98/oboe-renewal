import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

const SceneGraph = ({ sceneData, onNodeSelect, selectedNode, onVisibilityToggle }) => {
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [searchFilters, setSearchFilters] = useState({
        type: 'all',
        visibility: 'all'
    });
    
    // 스크롤 컨테이너 참조
    const scrollContainerRef = useRef(null);
    // 검색된 노드들의 DOM 요소 참조
    const searchResultRefs = useRef(new Map());

    // 디바운스 효과 - 300ms 후에 실제 검색 실행
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // 검색어 변경 핸들러 - 디바운스 적용
    const handleSearchChange = useCallback((e) => {
        const value = e.target.value;
        setSearchTerm(value);
        
        if (value) {
            console.log('Search input changed to:', value);
        }
    }, []);

    // 검색어 초기화
    const handleClearSearch = useCallback(() => {
        setSearchTerm('');
        setDebouncedSearchTerm('');
        setExpandedNodes(new Set());
        searchResultRefs.current.clear();
    }, []);

    // 검색 필터 변경
    const handleFilterChange = useCallback((filterType, value) => {
        setSearchFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    }, []);

    // 매칭되는 노드 ID들을 찾는 함수 - 개선된 버전
    const findMatchingNodes = useCallback((nodes, term) => {
        if (!term) return [];
        
        const matchingIds = new Set();
        
        const traverse = (nodeList) => {
            nodeList.forEach(node => {
                const nodeName = node.name || '';
                const searchLower = term.toLowerCase();
                const nodeNameLower = nodeName.toLowerCase();
                
                if (nodeNameLower.includes(searchLower)) {
                    console.log(`Found matching node: "${nodeName}" for search term "${term}"`);
                    matchingIds.add(node.id);
                    
                    // 부모 노드들도 확장
                    let parent = findParentNode(sceneData, node.id);
                    while (parent) {
                        console.log(`Expanding parent: "${parent.name}"`);
                        matchingIds.add(parent.id);
                        parent = findParentNode(sceneData, parent.id);
                    }
                }
                
                // 자식 노드들도 재귀적으로 검색
                if (node.children) {
                    traverse(node.children);
                }
            });
        };
        
        traverse(nodes);
        console.log('Matching node IDs:', Array.from(matchingIds));
        return Array.from(matchingIds);
    }, [sceneData]);

    // 부모 노드 찾기
    const findParentNode = useCallback((nodes, targetId, parent = null) => {
        for (const node of nodes) {
            if (node.id === targetId) {
                return parent;
            }
            if (node.children) {
                const found = findParentNode(node.children, targetId, node);
                if (found) return found;
            }
        }
        return null;
    }, []);

    // 디바운스된 검색어가 변경될 때 노드 확장 및 스크롤 처리
    useEffect(() => {
        if (debouncedSearchTerm) {
            console.log('Executing search for:', debouncedSearchTerm);
            
            const matchingNodes = findMatchingNodes(sceneData, debouncedSearchTerm);
            console.log('Matching nodes:', matchingNodes);
            setExpandedNodes(new Set(matchingNodes));
            
            // 검색 결과가 있으면 첫 번째 결과로 스크롤
            if (matchingNodes.length > 0) {
                setTimeout(() => {
                    scrollToFirstSearchResult();
                }, 100); // DOM 업데이트 후 스크롤
            }
        } else {
            setExpandedNodes(new Set());
            searchResultRefs.current.clear();
        }
    }, [debouncedSearchTerm, sceneData, findMatchingNodes]);

    // 첫 번째 검색 결과로 스크롤
    const scrollToFirstSearchResult = useCallback(() => {
        if (scrollContainerRef.current && searchResultRefs.current.size > 0) {
            const firstResult = Array.from(searchResultRefs.current.values())[0];
            if (firstResult) {
                firstResult.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }
    }, []);

    // 검색 결과 하이라이트 스크롤
    const scrollToNextSearchResult = useCallback(() => {
        if (searchResultRefs.current.size === 0) return;
        
        const currentIndex = Array.from(searchResultRefs.current.keys()).findIndex(
            id => searchResultRefs.current.get(id)?.classList.contains('search-highlight')
        );
        
        const nextIndex = (currentIndex + 1) % searchResultRefs.current.size;
        const nextId = Array.from(searchResultRefs.current.keys())[nextIndex];
        const nextElement = searchResultRefs.current.get(nextId);
        
        if (nextElement) {
            // 이전 하이라이트 제거
            searchResultRefs.current.forEach(element => {
                element.classList.remove('search-highlight');
            });
            
            // 새 하이라이트 추가
            nextElement.classList.add('search-highlight');
            nextElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }, []);

    const handleToggleNode = (nodeId) => {
        const newExpandedNodes = new Set(expandedNodes);
        if (newExpandedNodes.has(nodeId)) {
            newExpandedNodes.delete(nodeId);
        } else {
            newExpandedNodes.add(nodeId);
        }
        setExpandedNodes(newExpandedNodes);
    };

    const handleNodeSelect = (node) => {
        onNodeSelect?.(node);
    };

    const handleVisibilityToggle = (nodeId, visible) => {
        onVisibilityToggle?.(nodeId, visible);
    };

    const renderNode = (node, level = 0) => {
        const isExpanded = expandedNodes.has(node.id);
        const hasChildren = node.children && node.children.length > 0;
        const isSelected = selectedNode?.id === node.id;
        const isSearchResult = debouncedSearchTerm && 
            node.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

        return (
            <div 
                key={node.id} 
                className="select-none"
                ref={isSearchResult ? (el) => {
                    if (el) {
                        searchResultRefs.current.set(node.id, el);
                    } else {
                        searchResultRefs.current.delete(node.id);
                    }
                } : null}
            >
                <div
                    className={`flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                        isSelected ? 'bg-brand-100 dark:bg-brand-500/20' : ''
                    } ${isSearchResult ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
                    onClick={() => handleNodeSelect(node)}
                    tabIndex={0}
                    aria-label={`Select ${node.name}`}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleNodeSelect(node);
                        }
                    }}
                >
                    {/* 들여쓰기 */}
                    <div className="flex items-center" style={{ paddingLeft: `${level * 16}px` }}>
                        {/* 확장/축소 화살표 */}
                        {hasChildren && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleNode(node.id);
                                }}
                                className="w-4 h-4 mr-1 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            >
                                <svg
                                    className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}
                        {!hasChildren && <div className="w-4 h-4 mr-1" />}

                        {/* 노드 타입 아이콘 */}
                        <div className="w-4 h-4 mr-2 flex items-center justify-center">
                            {node.type === 'scene' && (
                                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                            )}
                            {node.type === 'collection' && (
                                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" />
                                </svg>
                            )}
                            {node.type === 'mesh' && (
                                <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                            )}
                            {node.type === 'light' && (
                                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            )}
                            {node.type === 'camera' && (
                                <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            )}
                            {node.type === 'object' && (
                                <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" />
                                </svg>
                            )}
                        </div>

                        {/* 노드 이름 - 검색 결과 하이라이트 */}
                        <span className="text-sm text-gray-900 dark:text-white flex-1">
                            {isSearchResult ? (
                                <span className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
                                    {node.name}
                                </span>
                            ) : (
                                node.name
                            )}
                        </span>

                        {/* 상태 아이콘들 */}
                        <div className="flex items-center space-x-1">
                            {/* 가시성 토글 */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleVisibilityToggle(node.id, !node.visible);
                                }}
                                className={`w-4 h-4 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                                    node.visible ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'
                                }`}
                                aria-label={node.visible ? 'Hide' : 'Show'}
                            >
                                <svg fill="currentColor" viewBox="0 0 24 24">
                                    {node.visible ? (
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z" />
                                    ) : (
                                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
                                    )}
                                </svg>
                            </button>

                            {/* 렌더링 토글 */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // 렌더링 토글 로직
                                }}
                                className={`w-4 h-4 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                                    node.renderable ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'
                                }`}
                                aria-label={node.renderable ? 'Disable render' : 'Enable render'}
                            >
                                <svg fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </button>

                            {/* 데이터/모디파이어 아이콘 */}
                            {node.hasModifiers && (
                                <div className="w-4 h-4 p-0.5">
                                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 자식 노드들 - 검색 중일 때도 모든 자식 표시 */}
                {hasChildren && isExpanded && (
                    <div className="ml-4">
                        {node.children.map((child) => renderNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    // sceneData가 null이거나 배열이 아닐 때 빈 배열 반환
    const safeSceneData = Array.isArray(sceneData) ? sceneData : [];
    
    // 고급 필터링 함수 - 검색 중일 때는 매칭되는 노드와 그 하위 노드들 모두 표시
    const filteredSceneData = useMemo(() => {
        let filtered = safeSceneData;
        
        // 검색어 필터링 (디바운스된 검색어 사용)
        if (debouncedSearchTerm) {
            filtered = filterSceneDataWithChildren(filtered, debouncedSearchTerm);
        }
        
        // 타입 필터링
        if (searchFilters.type !== 'all') {
            filtered = filterByType(filtered, searchFilters.type);
        }
        
        // 가시성 필터링
        if (searchFilters.visibility !== 'all') {
            filtered = filterByVisibility(filtered, searchFilters.visibility === 'visible');
        }
        
        return filtered;
    }, [safeSceneData, debouncedSearchTerm, searchFilters]);

    return (
        <div className="h-full flex flex-col">
            {/* 개선된 검색 바 */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search nodes..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-500 focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400 focus:border-brand-500 dark:focus:border-brand-400 sm:text-sm"
                    />
                    {searchTerm && (
                        <button
                            onClick={handleClearSearch}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            aria-label="Clear search"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
                
                {/* 고급 필터 옵션 */}
                {debouncedSearchTerm && (
                    <div className="mt-2 flex items-center space-x-2">
                        <select
                            value={searchFilters.type}
                            onChange={(e) => handleFilterChange('type', e.target.value)}
                            className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                            <option value="all">All Types</option>
                            <option value="mesh">Mesh</option>
                            <option value="light">Light</option>
                            <option value="camera">Camera</option>
                            <option value="collection">Collection</option>
                        </select>
                        
                        <select
                            value={searchFilters.visibility}
                            onChange={(e) => handleFilterChange('visibility', e.target.value)}
                            className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                            <option value="all">All Visibility</option>
                            <option value="visible">Visible Only</option>
                            <option value="hidden">Hidden Only</option>
                        </select>
                    </div>
                )}
            </div>

            {/* 검색 결과 요약 및 네비게이션 */}
            {debouncedSearchTerm && (
                <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 flex-shrink-0">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-blue-700 dark:text-blue-300">
                            Found {searchResultRefs.current.size} matching items
                        </span>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={scrollToNextSearchResult}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 px-2 py-1 rounded border border-blue-300 dark:border-blue-600"
                                title="Next result"
                            >
                                Next
                            </button>
                            <button
                                onClick={() => setExpandedNodes(new Set())}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                            >
                                Collapse All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 필터 및 추가 버튼 */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center space-x-2">
                    <button className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                        </svg>
                    </button>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {filteredSceneData.length} items
                    </span>
                </div>
                <button className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            {/* 씬 그래프 트리 - 스크롤 컨테이너 참조 추가 */}
            <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto custom-scrollbar"
            >
                {filteredSceneData.length > 0 ? (
                    filteredSceneData.map((node) => renderNode(node))
                ) : (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        {debouncedSearchTerm ? 'No matching items found' : 'No scene data available'}
                    </div>
                )}
            </div>
        </div>
    );
};

// 개선된 씬 데이터 필터링 함수 - 하위 노드들도 포함
const filterSceneDataWithChildren = (sceneData, searchTerm) => {
    const filterNode = (node) => {
        const nodeName = node.name || '';
        const searchLower = searchTerm.toLowerCase();
        const nodeNameLower = nodeName.toLowerCase();
        
        const matchesSearch = nodeNameLower.includes(searchLower);
        
        // 자식 노드들 중에 매칭되는 것이 있는지 확인
        const hasMatchingChildren = node.children && node.children.some(filterNode);
        
        if (matchesSearch || hasMatchingChildren) {
            return {
                ...node,
                children: node.children ? node.children.filter(filterNode) : []
            };
        }
        return null;
    };

    return sceneData.filter(filterNode);
};

// 기존 필터링 함수들 (타입별, 가시성별)
const filterByType = (sceneData, type) => {
    const filterNode = (node) => {
        const matchesType = node.type === type;
        const hasMatchingChildren = node.children && node.children.some(filterNode);
        
        if (matchesType || hasMatchingChildren) {
            return {
                ...node,
                children: node.children ? node.children.filter(filterNode) : []
            };
        }
        return null;
    };

    return sceneData.filter(filterNode);
};

const filterByVisibility = (sceneData, isVisible) => {
    const filterNode = (node) => {
        const matchesVisibility = node.visible === isVisible;
        const hasMatchingChildren = node.children && node.children.some(filterNode);
        
        if (matchesVisibility || hasMatchingChildren) {
            return {
                ...node,
                children: node.children ? node.children.filter(filterNode) : []
            };
        }
        return null;
    };

    return sceneData.filter(filterNode);
};

export default SceneGraph; 