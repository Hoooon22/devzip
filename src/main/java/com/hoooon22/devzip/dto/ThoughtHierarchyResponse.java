package com.hoooon22.devzip.dto;

import com.hoooon22.devzip.Model.Thought;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * 생각 계층 구조 응답 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ThoughtHierarchyResponse {

    private List<HierarchyNode> nodes;

    /**
     * 계층 구조 노드
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HierarchyNode {
        private Long id;
        private String content;
        private List<String> tags;
        private int level;  // 0 (최상위) ~ 3 (최하위)
        private Integer parentIndex;  // 부모 인덱스 (-1이면 최상위)

        @Builder.Default
        private List<HierarchyNode> children = new ArrayList<>();

        /**
         * Thought 엔티티로부터 HierarchyNode 생성
         */
        public static HierarchyNode fromThought(Thought thought, int level) {
            return HierarchyNode.builder()
                .id(thought.getId())
                .content(thought.getContent())
                .tags(thought.getTags())
                .level(level)
                .parentIndex(-1)
                .children(new ArrayList<>())
                .build();
        }

        /**
         * 자식 노드 추가
         */
        public void addChild(HierarchyNode child) {
            if (this.children == null) {
                this.children = new ArrayList<>();
            }
            this.children.add(child);
        }
    }
}
