import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './ThoughtMap.css';

// 호버박스 컴포넌트를 별도로 분리하여 메모이제이션
const ThoughtHoverBox = React.memo(({ hoveredNode, hoverPosition }) => {
  if (!hoveredNode?.data?.fullContent) return null;

  return (
    <div
      className="thought-hover-box"
      style={{
        position: 'fixed',
        left: `${hoverPosition.x + 15}px`,
        top: `${hoverPosition.y + 15}px`,
        maxWidth: '350px',
        background: 'white',
        border: `3px solid ${hoveredNode.data.levelColor || hoveredNode.data.clusterColor || '#667eea'}`,
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      <div className="hover-box-header">
        {hoveredNode.data.hierarchyLevel !== undefined ? (
          <span className="hover-box-badge" style={{ background: hoveredNode.data.levelColor }}>
            {hoveredNode.data.hierarchyLevel === 0 ? '핵심 생각' :
             hoveredNode.data.hierarchyLevel === 1 ? '관련 생각' :
             hoveredNode.data.hierarchyLevel === 2 ? '세부 생각' : '상세 생각'}
          </span>
        ) : (
          <span className="hover-box-badge" style={{ background: hoveredNode.data.clusterColor || '#667eea' }}>
            클러스터 {hoveredNode.data.clusterId + 1}
          </span>
        )}
        <span className="hover-box-id">#{hoveredNode.data.thoughtId}</span>
      </div>
      <div className="hover-box-content">
        {hoveredNode.data.fullContent}
      </div>
      {hoveredNode.data.tags && hoveredNode.data.tags.length > 0 && (
        <div className="hover-box-tags">
          <strong>AI 추출 태그:</strong>
          <div className="tag-list">
            {hoveredNode.data.tags.map((tag, idx) => (
              <span key={idx} className="hover-tag" style={{
                borderColor: hoveredNode.data.levelColor || hoveredNode.data.clusterColor
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
      {hoveredNode.data.hierarchyLevel !== undefined ? (
        <div className="hover-box-cluster-info">
          <span className="cluster-indicator" style={{
            background: hoveredNode.data.levelColor
          }}>●</span>
          AI가 유사도 분석으로 레벨 {hoveredNode.data.hierarchyLevel}로 분류했습니다
        </div>
      ) : (
        <div className="hover-box-cluster-info">
          <span className="cluster-indicator" style={{ background: hoveredNode.data.clusterColor }}>●</span>
          AI가 이 생각을 같은 주제로 그룹화했습니다
        </div>
      )}
    </div>
  );
});

ThoughtHoverBox.displayName = 'ThoughtHoverBox';

ThoughtHoverBox.propTypes = {
  hoveredNode: PropTypes.shape({
    data: PropTypes.shape({
      fullContent: PropTypes.string,
      tags: PropTypes.arrayOf(PropTypes.string),
      hierarchyLevel: PropTypes.number,
      levelColor: PropTypes.string,
      clusterId: PropTypes.number,
      clusterColor: PropTypes.string,
      thoughtId: PropTypes.number,
    }),
  }),
  hoverPosition: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired,
};

const ThoughtMap = ({ mapData, isLoading }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  // 마우스 이동 throttling을 위한 ref
  const lastMoveTime = useRef(0);
  const THROTTLE_MS = 16; // ~60fps (16ms)

  // 호버 상태 업데이트를 최적화하기 위한 useCallback
  const handleNodeMouseEnter = useCallback((event, node) => {
    if (node.data.fullContent) {
      setHoveredNode(node);
      setHoverPosition({ x: event.clientX, y: event.clientY });
    }
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const handleNodeMouseMove = useCallback((event) => {
    if (!hoveredNode) return;

    const now = Date.now();
    if (now - lastMoveTime.current < THROTTLE_MS) return;

    lastMoveTime.current = now;
    setHoverPosition({ x: event.clientX, y: event.clientY });
  }, [hoveredNode]);

  // mapData를 React Flow 노드/엣지로 변환
  useEffect(() => {
    if (!mapData) {
      setNodes([]);
      setEdges([]);
      return;
    }

    console.log('%c╔════════════════════════════════════════╗', 'color: #673AB7');
    console.log('%c║   🎨 ThoughtMap 렌더링 시작        ║', 'color: #673AB7; font-weight: bold');
    console.log('%c╚════════════════════════════════════════╝', 'color: #673AB7');

    const newNodes = [];
    const newEdges = [];

    // 계층 구조 맵 데이터인 경우 (nodes 필드 있고 배열의 첫 요소가 level을 가짐)
    if (Array.isArray(mapData.nodes) && mapData.nodes.length > 0 && mapData.nodes[0].level !== undefined) {
      console.log('%c📐 렌더링 모드: 마인드맵 (방사형 계층 구조)', 'color: #9C27B0; font-weight: bold');
      console.log('%c📊 총 노드 수:', 'color: #673AB7; font-weight: bold', mapData.nodes.length);

      // 마인드맵 중심점
      const centerX = 600;
      const centerY = 400;
      const baseRadius = 180; // 첫 번째 레벨 거리
      const radiusIncrement = 200; // 레벨당 거리 증가량

      const processHierarchyNode = (node, parentX, parentY, angleStart, angleEnd, depth = 0) => {
        const level = node.level || 0;
        const nodeId = `hierarchy-${node.id}`;

        console.log(`%c🔹 Processing Node ID: ${node.id}, Level: ${level}, Children: ${node.children?.length || 0}`,
          'color: #2196F3; font-weight: bold');

        let x, y;

        if (level === 0) {
          // 레벨 0은 중앙에 배치
          x = centerX;
          y = centerY;
        } else {
          // 하위 레벨은 부모로부터 방사형으로 배치
          const radius = baseRadius + (level - 1) * radiusIncrement;
          const angle = (angleStart + angleEnd) / 2;
          x = (parentX || centerX) + radius * Math.cos(angle);
          y = (parentY || centerY) + radius * Math.sin(angle);
        }

        // 레벨별 색상 및 크기
        const levelColors = [
          '#667eea', // Level 0 - 핵심 (보라)
          '#f093fb', // Level 1 - 주요 (핑크)
          '#4facfe', // Level 2 - 세부 (파랑)
          '#43e97b', // Level 3 - 상세 (초록)
          '#f5af19', // Level 4+ (주황)
        ];
        const nodeColor = levelColors[Math.min(level, 4)] || '#999';

        // 레벨별 크기 (중심이 가장 크고 멀어질수록 작아짐)
        const nodeSizes = [
          { width: '280px', fontSize: '16px', padding: '20px', borderWidth: '4px' }, // Level 0
          { width: '240px', fontSize: '14px', padding: '16px', borderWidth: '3px' }, // Level 1
          { width: '220px', fontSize: '13px', padding: '14px', borderWidth: '3px' }, // Level 2
          { width: '200px', fontSize: '12px', padding: '12px', borderWidth: '2px' }, // Level 3+
        ];
        const nodeSize = nodeSizes[Math.min(level, 3)];

        newNodes.push({
          id: nodeId,
          type: 'default',
          data: {
            label: (
              <div className="thought-node mindmap-node">
                {level === 0 && <div className="mindmap-center-badge">💡 핵심 아이디어</div>}
                {level > 0 && <div className="thought-node-level">Level {level}</div>}
                <div className="thought-node-content">
                  {node.content.length > (level === 0 ? 100 : 70)
                    ? node.content.substring(0, level === 0 ? 100 : 70) + '...'
                    : node.content}
                </div>
                {node.tags && node.tags.length > 0 && (
                  <div className="thought-tags">
                    {node.tags.slice(0, level === 0 ? 4 : 3).map((tag, idx) => (
                      <span key={idx} className="tag-badge" style={{ background: `${nodeColor}20`, color: nodeColor }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ),
            // 호버박스용 메타데이터
            fullContent: node.content,
            tags: node.tags || [],
            hierarchyLevel: level,
            levelColor: nodeColor,
            thoughtId: node.id,
          },
          position: { x: x - 110, y: y - 60 }, // 노드 중심 조정
          style: {
            background: level === 0 ? `linear-gradient(135deg, ${nodeColor} 0%, ${nodeColor}dd 100%)` : 'white',
            color: level === 0 ? 'white' : '#333',
            border: level === 0 ? 'none' : `${nodeSize.borderWidth} solid ${nodeColor}`,
            borderRadius: level === 0 ? '24px' : '16px',
            padding: nodeSize.padding,
            fontSize: nodeSize.fontSize,
            maxWidth: nodeSize.width,
            boxShadow: level === 0
              ? '0 8px 24px rgba(102, 126, 234, 0.3)'
              : '0 4px 12px rgba(0, 0, 0, 0.1)',
            fontWeight: level === 0 ? '600' : '400',
          },
        });

        // 자식 노드들 처리
        if (node.children && node.children.length > 0) {
          const childCount = node.children.length;
          const angleRange = level === 0 ? (2 * Math.PI) : (Math.PI / 3); // 레벨 0은 360도, 나머지는 60도 범위
          const baseAngle = level === 0 ? 0 : (angleStart + angleEnd) / 2 - angleRange / 2;

          node.children.forEach((child, childIdx) => {
            const childAngleStart = baseAngle + (angleRange * childIdx / childCount);
            const childAngleEnd = baseAngle + (angleRange * (childIdx + 1) / childCount);
            const childNodeId = processHierarchyNode(child, x, y, childAngleStart, childAngleEnd, depth + 1);

            // 부모-자식 간 곡선 엣지 연결
            newEdges.push({
              id: `edge-${nodeId}-${childNodeId}`,
              source: nodeId,
              target: childNodeId,
              type: 'smoothstep', // 부드러운 곡선
              animated: false,
              style: {
                stroke: nodeColor,
                strokeWidth: level === 0 ? 3 : 2,
                opacity: 0.7,
              },
              markerEnd: {
                type: 'arrowclosed',
                color: nodeColor,
                width: 20,
                height: 20,
              },
            });
          });
        }

        return nodeId;
      };

      // 최상위 노드들 처리
      console.log('%c🌳 마인드맵 트리 구성 중...', 'color: #4CAF50; font-weight: bold');
      mapData.nodes.forEach((rootNode, idx) => {
        processHierarchyNode(rootNode, null, null, 0, 2 * Math.PI, 0);
      });

      console.log('%c✨ 렌더링 완료', 'color: #4CAF50; font-weight: bold; font-size: 13px');
      console.log('%c  ├─ 노드:', 'color: #4CAF50', `${newNodes.length}개`);
      console.log('%c  └─ 연결선:', 'color: #4CAF50', `${newEdges.length}개`);
    }
    // 주제 중심 맵 데이터인 경우 (topicId, topicName, clusters 필드 있음)
    else if (mapData.topicId !== undefined) {
      // 주제 중심 노드
      const topicNodeId = 'topic-center';
      newNodes.push({
        id: topicNodeId,
        type: 'default',
        data: {
          label: (
            <div className="topic-center-node">
              <span className="topic-emoji">{mapData.topicEmoji || '💭'}</span>
              <strong>{mapData.topicName}</strong>
            </div>
          ),
        },
        position: { x: 400, y: 300 },
        style: {
          background: mapData.topicColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '16px',
          padding: '16px 24px',
          fontWeight: 'bold',
          minWidth: '200px',
          fontSize: '16px',
        },
      });

      // 클러스터별로 생각 노드 배치
      const clusters = mapData.clusters || [];
      const clusterColors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];

      clusters.forEach((cluster, clusterIndex) => {
        const clusterThoughts = cluster.thoughts || [];
        if (clusterThoughts.length === 0) return;

        // 클러스터별 각도 계산 (원형으로 분산)
        const clusterAngle = (clusterIndex / clusters.length) * 2 * Math.PI;
        const clusterColor = clusterColors[clusterIndex % clusterColors.length];

        // 클러스터 내 생각들을 체인 형태로 배치
        clusterThoughts.forEach((thought, thoughtIndex) => {
          const thoughtNodeId = `thought-${clusterIndex}-${thoughtIndex}`;

          // 첫 번째 생각은 주제에서 일정 거리, 나머지는 이전 생각에서 연결
          let x, y;
          if (thoughtIndex === 0) {
            // 클러스터의 첫 번째 노드는 주제 주변에 배치
            const radius = 300;
            x = 400 + radius * Math.cos(clusterAngle);
            y = 300 + radius * Math.sin(clusterAngle);
          } else {
            // 나머지 노드는 클러스터 방향으로 체인 형태로 배치
            const chainRadius = 200;
            const offsetAngle = clusterAngle + (thoughtIndex * 0.3 - 0.15);
            x = 400 + (300 + chainRadius * thoughtIndex * 0.5) * Math.cos(offsetAngle);
            y = 300 + (300 + chainRadius * thoughtIndex * 0.5) * Math.sin(offsetAngle);
          }

          newNodes.push({
            id: thoughtNodeId,
            type: 'default',
            data: {
              label: (
                <div className="thought-node">
                  <div className="thought-node-content">
                    {thought.content.length > 80
                      ? thought.content.substring(0, 80) + '...'
                      : thought.content}
                  </div>
                  {thought.tags && thought.tags.length > 0 && (
                    <div className="thought-tags">
                      {thought.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="tag-badge">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ),
              // 호버박스용 메타데이터
              fullContent: thought.content,
              tags: thought.tags || [],
              clusterId: clusterIndex,
              clusterColor: clusterColor,
              thoughtId: thought.id,
            },
            position: { x, y },
            style: {
              background: 'white',
              border: `2px solid ${clusterColor}`,
              borderRadius: '12px',
              padding: '12px',
              fontSize: '13px',
              maxWidth: '220px',
            },
          });

          // 엣지 연결
          if (thoughtIndex === 0) {
            // 클러스터 첫 번째 노드는 주제와 연결
            newEdges.push({
              id: `edge-${topicNodeId}-${thoughtNodeId}`,
              source: topicNodeId,
              target: thoughtNodeId,
              animated: true,
              style: {
                stroke: clusterColor,
                strokeWidth: 2,
              },
            });
          } else {
            // 나머지 노드는 이전 노드와 연결 (체인)
            const prevNodeId = `thought-${clusterIndex}-${thoughtIndex - 1}`;
            newEdges.push({
              id: `edge-${prevNodeId}-${thoughtNodeId}`,
              source: prevNodeId,
              target: thoughtNodeId,
              animated: false,
              style: {
                stroke: clusterColor,
                strokeWidth: 2,
              },
            });
          }
        });
      });
    }
    // 전체 보기 - 주제 목록 표시 (배열이고 topics 필드가 있는 경우)
    else if (Array.isArray(mapData) && mapData.length > 0 && mapData[0].id !== undefined) {
      // 그리드 레이아웃으로 주제 노드 배치
      const columns = Math.ceil(Math.sqrt(mapData.length));
      const spacing = 250;
      const startX = 100;
      const startY = 100;

      mapData.forEach((topic, index) => {
        const row = Math.floor(index / columns);
        const col = index % columns;

        newNodes.push({
          id: `topic-${topic.id}`,
          type: 'default',
          data: {
            label: (
              <div className="topic-overview-node">
                <span className="topic-emoji">{topic.emoji || '💭'}</span>
                <strong>{topic.name}</strong>
                <span className="thought-count">({topic.thoughtCount || 0})</span>
              </div>
            ),
          },
          position: {
            x: startX + col * spacing,
            y: startY + row * spacing,
          },
          style: {
            background: topic.color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            padding: '16px 24px',
            fontWeight: 'bold',
            minWidth: '180px',
            fontSize: '15px',
            cursor: 'pointer',
          },
        });
      });
    }
    // 태그별 그룹화 맵 데이터인 경우 (배열 형태)
    else if (Array.isArray(mapData)) {
      let yPosition = 0;

      mapData.forEach((tagGroup, groupIndex) => {
        const tagNodeId = `tag-${groupIndex}`;

        // 태그 중심 노드
        newNodes.push({
          id: tagNodeId,
          type: 'default',
          data: {
            label: (
              <div className="tag-node">
                <span className="tag-icon">🏷️</span>
                <strong>{tagGroup.tag}</strong>
                <span className="tag-count">({tagGroup.thoughts.length})</span>
              </div>
            ),
          },
          position: { x: 250, y: yPosition },
          style: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 20px',
            fontWeight: 'bold',
            minWidth: '180px',
          },
        });

        // 생각 노드들
        tagGroup.thoughts.forEach((thought, thoughtIndex) => {
          const thoughtNodeId = `thought-${groupIndex}-${thoughtIndex}`;
          const angle = (thoughtIndex / tagGroup.thoughts.length) * 2 * Math.PI;
          const radius = 250;

          newNodes.push({
            id: thoughtNodeId,
            type: 'default',
            data: {
              label: (
                <div className="thought-node">
                  <div className="thought-node-content">
                    {thought.content.length > 80
                      ? thought.content.substring(0, 80) + '...'
                      : thought.content}
                  </div>
                </div>
              ),
            },
            position: {
              x: 250 + radius * Math.cos(angle),
              y: yPosition + radius * Math.sin(angle),
            },
            style: {
              background: 'white',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '13px',
              maxWidth: '200px',
            },
          });

          // 태그 노드와 생각 노드 연결
          newEdges.push({
            id: `edge-${tagNodeId}-${thoughtNodeId}`,
            source: tagNodeId,
            target: thoughtNodeId,
            animated: true,
            style: { stroke: '#667eea', strokeWidth: 2 },
          });
        });

        yPosition += 600; // 다음 태그 그룹은 아래로
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [mapData, setNodes, setEdges]);

  // 로딩 중이고 데이터가 없으면 전체 로딩 화면 표시
  if (isLoading && !mapData) {
    return (
      <div className="thought-map-container">
        <div className="thought-map-loading">
          <div className="spinner"></div>
          <p>마인드맵을 생성하는 중...</p>
        </div>
      </div>
    );
  }

  // 로딩 중이 아닌데 데이터가 비어있으면 빈 상태 표시
  if (!isLoading && (!mapData ||
      (Array.isArray(mapData) && mapData.length === 0) ||
      (mapData.topicId && (!mapData.clusters || mapData.clusters.length === 0 ||
        mapData.clusters.every(c => !c.thoughts || c.thoughts.length === 0))))) {
    return (
      <div className="thought-map-container">
        <div className="thought-map-empty">
          <span className="empty-icon">🗺️</span>
          <p>아직 생각 지도가 비어있습니다</p>
          <p className="empty-hint">
            {mapData?.topicId
              ? '이 주제에 생각을 저장하면 AI가 자동으로 연관 관계를 분석하여 지도를 그려줍니다'
              : '주제를 만들고 생각을 저장해보세요'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="thought-map-container">
      <div className="thought-map-header">
        <h2>생각 지도</h2>
        <p className="thought-map-description">
          {mapData.topicId
            ? `${mapData.topicName} 주제의 생각들을 탐험해보세요`
            : Array.isArray(mapData) && mapData.length > 0 && mapData[0].id !== undefined
            ? '주제를 클릭하면 해당 주제의 생각들을 확인할 수 있습니다'
            : '태그를 중심으로 연결된 생각들을 탐험해보세요'}
        </p>
      </div>

      <div className="thought-map-canvas" style={{ position: 'relative' }}>
        {/* 구석 로딩 인디케이터 - 백그라운드 AI 분석 중 */}
        {isLoading && mapData && (
          <div className="corner-loading-indicator">
            <div className="corner-spinner"></div>
            <div>
              <div className="corner-loading-text">AI 분석 중</div>
              <div className="corner-loading-subtext">생각 지도 업데이트 중...</div>
            </div>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          onNodeMouseMove={handleNodeMouseMove}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#f0f0f0" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.id.startsWith('tag-') || node.id.startsWith('topic-')) return '#667eea';
              return '#e0e0e0';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>

        {/* 호버박스 - 메모이제이션된 컴포넌트 사용 */}
        <ThoughtHoverBox hoveredNode={hoveredNode} hoverPosition={hoverPosition} />
      </div>
    </div>
  );
};

ThoughtMap.propTypes = {
  mapData: PropTypes.oneOfType([
    // 태그별 그룹화 맵
    PropTypes.arrayOf(
      PropTypes.shape({
        tag: PropTypes.string.isRequired,
        thoughts: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.number.isRequired,
            content: PropTypes.string.isRequired,
          })
        ).isRequired,
      })
    ),
    // 주제 중심 맵 (클러스터 구조)
    PropTypes.shape({
      topicId: PropTypes.number.isRequired,
      topicName: PropTypes.string.isRequired,
      topicEmoji: PropTypes.string,
      topicColor: PropTypes.string,
      clusters: PropTypes.arrayOf(
        PropTypes.shape({
          clusterId: PropTypes.string.isRequired,
          thoughts: PropTypes.arrayOf(
            PropTypes.shape({
              id: PropTypes.number.isRequired,
              content: PropTypes.string.isRequired,
              tags: PropTypes.arrayOf(PropTypes.string),
            })
          ).isRequired,
        })
      ).isRequired,
    }),
    // 계층 구조 맵
    PropTypes.shape({
      nodes: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.number.isRequired,
          content: PropTypes.string.isRequired,
          tags: PropTypes.arrayOf(PropTypes.string),
          level: PropTypes.number.isRequired,
          parentIndex: PropTypes.number,
          children: PropTypes.array,
        })
      ),
    }),
  ]),
  isLoading: PropTypes.bool,
};

ThoughtMap.defaultProps = {
  mapData: null,
  isLoading: false,
};

export default ThoughtMap;
