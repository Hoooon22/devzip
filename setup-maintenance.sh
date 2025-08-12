#!/bin/bash
# TraceBoard 점검 페이지 설정 스크립트

echo "🔧 TraceBoard 점검 페이지 설정을 시작합니다..."

# 1. nginx 설치 확인
if ! command -v nginx &> /dev/null; then
    echo "❌ nginx가 설치되어 있지 않습니다."
    echo "Ubuntu/Debian: sudo apt update && sudo apt install nginx"
    echo "CentOS/RHEL: sudo yum install nginx"
    echo "macOS: brew install nginx"
    exit 1
fi

# 2. 점검 페이지를 nginx 디렉토리로 복사
echo "📄 점검 페이지를 설정합니다..."
sudo mkdir -p /var/www/html
sudo cp maintenance.html /var/www/html/
sudo chown www-data:www-data /var/www/html/maintenance.html 2>/dev/null || sudo chown nginx:nginx /var/www/html/maintenance.html 2>/dev/null || echo "⚠️  파일 소유권 설정을 건너뜁니다."

# 3. nginx 설정 백업 및 적용
echo "⚙️  nginx 설정을 백업합니다..."
if [ -f /etc/nginx/sites-available/default ]; then
    sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)
    echo "📋 nginx 설정 파일 예시를 확인하세요: nginx-maintenance.conf"
    echo "   실제 도메인과 포트에 맞게 수정 후 적용하세요."
elif [ -f /etc/nginx/nginx.conf ]; then
    sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
    echo "📋 nginx 설정 파일 예시를 확인하세요: nginx-maintenance.conf"
fi

# 4. nginx 설정 테스트 및 재시작 가이드
echo ""
echo "✅ 점검 페이지 설정이 완료되었습니다!"
echo ""
echo "🔧 다음 단계를 수행하세요:"
echo "1. nginx-maintenance.conf 파일을 열어서 도메인과 포트를 실제 환경에 맞게 수정"
echo "2. nginx 설정 파일에 해당 내용을 추가하거나 대체"
echo "3. nginx 설정 테스트: sudo nginx -t"
echo "4. nginx 재시작: sudo systemctl restart nginx"
echo ""
echo "📍 파일 위치:"
echo "   - 점검 페이지: /var/www/html/maintenance.html"
echo "   - 설정 예시: ./nginx-maintenance.conf"
echo ""
echo "🚀 설정 완료 후 백엔드 서버가 중단되면 자동으로 점검 페이지가 표시됩니다."

# 5. 권한 확인
echo ""
echo "🔍 파일 권한 확인:"
ls -la /var/www/html/maintenance.html

echo ""
echo "💡 팁: 백엔드 서버 상태를 확인하려면 다음 명령어를 사용하세요:"
echo "   - Spring Boot 서버: curl http://localhost:8080/actuator/health"
echo "   - nginx 상태: sudo systemctl status nginx"