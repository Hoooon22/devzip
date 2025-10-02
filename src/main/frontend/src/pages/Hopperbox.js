import React, { useState, useEffect } from 'react';
import ThoughtInput from '../components/hopperbox/ThoughtInput';
import ThoughtMap from '../components/hopperbox/ThoughtMap';
import TopicSelector from '../components/hopperbox/TopicSelector';
import thoughtService from '../services/thoughtService';
import topicService from '../services/topicService';
import './Hopperbox.css';

const Hopperbox = () => {
  const [topics, setTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [mapData, setMapData] = useState([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isLoadingMap, setIsLoadingMap] = useState(false);

  // 주제 목록 불러오기 (생각 개수는 선택 시에만 조회)
  const fetchTopics = async () => {
    setIsLoadingTopics(true);
    try {
      const response = await topicService.getAllTopics();
      const topicsData = response.data || [];

      // 생각 개수는 기본값 0으로 설정 (선택 시 자동 업데이트됨)
      setTopics(topicsData.map(topic => ({ ...topic, thoughtCount: 0 })));
    } catch (error) {
      console.error('Failed to load topics:', error);
      setTopics([]);
    } finally {
      setIsLoadingTopics(false);
    }
  };

  // 생각 맵 데이터 불러오기 (주제별 필터링)
  const fetchThoughtMap = async (topicId = null) => {
    setIsLoadingMap(true);
    try {
      if (topicId) {
        // 주제 중심 계층 구조 맵 데이터 조회 (유사도 기반)
        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #4CAF50');
        console.log('%c🎯 Hopperbox 계층 구조 맵 요청', 'color: #2196F3; font-weight: bold; font-size: 14px');
        console.log('%c주제 ID:', 'color: #FF9800; font-weight: bold', topicId);

        const response = await thoughtService.getTopicHierarchyMap(topicId);
        const nodeCount = response.data?.nodes?.length || 0;

        console.log('%c✅ 서버 응답 수신 완료', 'color: #4CAF50; font-weight: bold');
        console.log('%c📊 노드 개수:', 'color: #9C27B0; font-weight: bold', nodeCount);

        if (response.data?.nodes && nodeCount > 0) {
          // 계층 구조 분석
          const levelCount = {};
          const hasParent = response.data.nodes.filter(n => n.parentIndex !== -1).length;

          response.data.nodes.forEach(node => {
            levelCount[node.level] = (levelCount[node.level] || 0) + 1;
          });

          console.log('%c🔍 계층 구조 분석:', 'color: #FF5722; font-weight: bold');
          console.log('  레벨별 분포:', levelCount);
          console.log('  연결된 노드:', `${hasParent}/${nodeCount}개`);
          console.log('  최상위 노드:', `${nodeCount - hasParent}개`);

          // AI API 연결 상태 확인
          const isAiConnected = Object.keys(levelCount).length > 1 || hasParent > 0;
          if (isAiConnected) {
            console.log('%c🤖 AI API 연결: ✅ 정상', 'color: #4CAF50; font-weight: bold; background: #E8F5E9; padding: 2px 8px');
            console.log('  └─ 계층 구조가 AI에 의해 생성되었습니다');
          } else {
            console.log('%c🤖 AI API 연결: ⚠️  미연결', 'color: #FF9800; font-weight: bold; background: #FFF3E0; padding: 2px 8px');
            console.log('  └─ 태그 기반 기본 구조가 사용되었습니다');
            console.log('  └─ Google AI Studio API 키를 확인하세요');
          }

          console.log('%c📝 노드 상세:', 'color: #3F51B5; font-weight: bold');
          response.data.nodes.forEach((node, idx) => {
            const emoji = node.level === 0 ? '🌟' : node.level === 1 ? '📌' : node.level === 2 ? '📍' : '📎';
            console.log(`  ${emoji} [${idx}] Lv.${node.level} ${node.parentIndex !== -1 ? `(부모: ${node.parentIndex})` : '(최상위)'}`);
            console.log(`      내용: ${node.content.substring(0, 40)}${node.content.length > 40 ? '...' : ''}`);
            console.log(`      태그: ${node.tags?.join(', ') || '없음'}`);
          });
        } else {
          console.log('%c⚠️  노드가 없습니다', 'color: #FF9800; font-weight: bold');
        }

        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #4CAF50');
        setMapData(response.data || null);
      } else {
        // 전체 보기 (주제 목록 표시)
        // topics 배열에 각 주제별 생각 개수를 추가
        const topicsWithCount = await Promise.all(
          topics.map(async (topic) => {
            try {
              const response = await thoughtService.getTopicCentricMap(topic.id);
              return {
                ...topic,
                thoughtCount: response.data?.thoughts?.length || 0
              };
            } catch (error) {
              console.error(`Failed to get thought count for topic ${topic.id}:`, error);
              return {
                ...topic,
                thoughtCount: 0
              };
            }
          })
        );
        setMapData(topicsWithCount);
      }
    } catch (error) {
      console.error('Failed to load thought map:', error);
      setMapData(topicId ? null : []);
    } finally {
      setIsLoadingMap(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    fetchTopics();
    fetchThoughtMap();
  }, []);

  // 주제 선택 시 맵 데이터 다시 로드
  useEffect(() => {
    fetchThoughtMap(selectedTopicId);
  }, [selectedTopicId]);

  // 새 생각 저장
  const handleThoughtSubmit = async (content) => {
    try {
      await thoughtService.createThoughtWithTopic(content, selectedTopicId);
      // 저장 후 맵 다시 로드
      await fetchThoughtMap(selectedTopicId);
    } catch (error) {
      console.error('Failed to submit thought:', error);
      throw error;
    }
  };

  // 주제 선택
  const handleTopicSelect = (topicId) => {
    setSelectedTopicId(topicId);
  };

  // 새 주제 생성
  const handleCreateTopic = async (name, description, color, emoji) => {
    try {
      await topicService.createTopic(name, description, color, emoji);
      await fetchTopics();
    } catch (error) {
      console.error('Failed to create topic:', error);
      throw error;
    }
  };

  // 주제 삭제
  const handleDeleteTopic = async (topicId) => {
    try {
      await topicService.deleteTopic(topicId);
      if (selectedTopicId === topicId) {
        setSelectedTopicId(null);
      }
      await fetchTopics();
    } catch (error) {
      console.error('Failed to delete topic:', error);
      throw error;
    }
  };

  return (
    <div className="hopperbox-container">
      {/* 헤더 */}
      <header className="hopperbox-header">
        <div className="hopperbox-title">
          <h1>🎁 Hopperbox</h1>
          <p className="hopperbox-subtitle">
            주제를 선택하고 생각을 자유롭게 던져보세요!
          </p>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="hopperbox-main">
        {/* 주제 선택 사이드바 */}
        <TopicSelector
          topics={topics}
          selectedTopicId={selectedTopicId}
          onTopicSelect={handleTopicSelect}
          onCreateTopic={handleCreateTopic}
          onDeleteTopic={handleDeleteTopic}
        />

        {/* 생각 영역 */}
        <div className="hopperbox-content">
          {/* 입력 영역 */}
          <section className="hopperbox-input-section">
            <ThoughtInput onThoughtSubmit={handleThoughtSubmit} />
          </section>

          {/* 마인드맵 */}
          <section className="hopperbox-map-section">
            <ThoughtMap mapData={mapData} isLoading={isLoadingMap} />
          </section>
        </div>
      </div>
    </div>
  );
};

export default Hopperbox;