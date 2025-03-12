package com.hoooon22.devzip.Config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import com.hoooon22.devzip.Handler.ChatHandler;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // 클라이언트가 연결할 엔드포인트 (SockJS 지원)
        registry.addEndpoint("/ws").setAllowedOriginPatterns("*").withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // 클라이언트가 구독할 수 있는 목적지 접두사
        registry.enableSimpleBroker("/topic");
        // 클라이언트가 메시지를 보낼 때 사용하는 접두사
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Bean
    public ChatHandler chatHandler() {
        return new ChatHandler();
    }

    // custom SimpMessagingTemplate 빈에 @Primary를 추가하여 우선순위를 높입니다.
    @Primary
    @Bean
    public SimpMessagingTemplate simpMessagingTemplate(MessageChannel clientOutboundChannel) {
        return new SimpMessagingTemplate(clientOutboundChannel);
    }
}
