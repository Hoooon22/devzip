package com.hoooon22.devzip.Controller;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@RestController
public class SitemapController {

    private final RequestMappingHandlerMapping requestMappingHandlerMapping;

    public SitemapController(RequestMappingHandlerMapping requestMappingHandlerMapping) {
        this.requestMappingHandlerMapping = requestMappingHandlerMapping;
    }

    @GetMapping(value = "/sitemap.xml", produces = "application/xml")
    public void getSitemap(HttpServletRequest request, HttpServletResponse response) {
        response.setContentType("application/xml");
        try {
            String sitemapXml = genSitemapXml();
            response.getWriter().write(sitemapXml);
        } catch (Exception e) {
            e.printStackTrace(); // 예외 발생 시 스택 트레이스를 출력
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR); // 500 상태 코드 설정
            try {
                response.getWriter().write("Error generating sitemap");
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
    }
    

    private String genSitemapXml() {
        String host = "https://www.devzip.site"; // 사이트 URL
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX");
        String formattedDateTime = now.atOffset(ZoneOffset.UTC).format(formatter);

        // 모든 핸들러 메소드에서 URL 수집
        var handlerMethods = requestMappingHandlerMapping.getHandlerMethods();
        for (var entry : handlerMethods.entrySet()) {
            var patternsCondition = entry.getKey().getPatternsCondition();
            if (patternsCondition != null) {
                patternsCondition.getPatterns().forEach(url -> {
                    sb.append("  <url>\n");
                    sb.append("    <loc>").append(host).append(url).append("</loc>\n");
                    sb.append("    <lastmod>").append(formattedDateTime).append("</lastmod>\n");
                    sb.append("    <changefreq>monthly</changefreq>\n"); // 변경 빈도 추가
                    sb.append("    <priority>0.5</priority>\n"); // 우선순위 추가
                    sb.append("  </url>\n");
                });
            }
        }

        sb.append("</urlset>");
        return sb.toString();
    }
}
