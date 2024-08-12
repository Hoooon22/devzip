// src/main/frontend/src/setProxy.js

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );

  // WebSocket 요청 프록시 설정
  app.use(
    '/game-chatting',
    createProxyMiddleware({
      target: 'ws://localhost:8080',  // WebSocket 서버 URL
      ws: true,  // WebSocket 연결을 프록시하도록 설정
      changeOrigin: true,
    })
  );
};