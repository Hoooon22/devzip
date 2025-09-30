import React, { useEffect } from 'react';
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

const ThoughtMap = ({ mapData, isLoading }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // mapData를 React Flow 노드/엣지로 변환
  useEffect(() => {
    if (!mapData || mapData.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const newNodes = [];
    const newEdges = [];
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

    setNodes(newNodes);
    setEdges(newEdges);
  }, [mapData, setNodes, setEdges]);

  if (isLoading) {
    return (
      <div className="thought-map-container">
        <div className="thought-map-loading">
          <div className="spinner"></div>
          <p>마인드맵을 생성하는 중...</p>
        </div>
      </div>
    );
  }

  if (!mapData || mapData.length === 0) {
    return (
      <div className="thought-map-container">
        <div className="thought-map-empty">
          <span className="empty-icon">🗺️</span>
          <p>아직 생각 지도가 비어있습니다</p>
          <p className="empty-hint">
            생각을 저장하면 AI가 자동으로 연관 관계를 분석하여 지도를 그려줍니다
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
          태그를 중심으로 연결된 생각들을 탐험해보세요
        </p>
      </div>

      <div className="thought-map-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#f0f0f0" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.id.startsWith('tag-')) return '#667eea';
              return '#e0e0e0';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      </div>
    </div>
  );
};

ThoughtMap.propTypes = {
  mapData: PropTypes.arrayOf(
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
  isLoading: PropTypes.bool,
};

ThoughtMap.defaultProps = {
  mapData: [],
  isLoading: false,
};

export default ThoughtMap;