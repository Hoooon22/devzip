package com.hoooon22.devzip.dto;

import com.hoooon22.devzip.Model.Thought;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
public class ThoughtMapResponse {
    private String tag;
    private List<ThoughtSummary> thoughts;

    public static ThoughtMapResponse from(String tag, List<Thought> thoughts) {
        ThoughtMapResponse response = new ThoughtMapResponse();
        response.tag = tag;
        response.thoughts = thoughts.stream()
            .map(ThoughtSummary::from)
            .collect(Collectors.toList());
        return response;
    }

    @Data
    @NoArgsConstructor
    public static class ThoughtSummary {
        private Long id;
        private String content;

        public static ThoughtSummary from(Thought thought) {
            ThoughtSummary summary = new ThoughtSummary();
            summary.id = thought.getId();
            summary.content = thought.getContent();
            return summary;
        }
    }
}