package com.hoooon22.devzip.Controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SitemapController {

    private static final String BASE_URL = "https://devzip.cloud";

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public String getSitemap() {
        StringBuilder sitemap = new StringBuilder();
        sitemap.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sitemap.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        // 메인 페이지
        addUrl(sitemap, BASE_URL + "/", "1.0", "weekly");

        // 주요 페이지
        addUrl(sitemap, BASE_URL + "/Guestbook", "0.8", "weekly");
        addUrl(sitemap, BASE_URL + "/Joke", "0.8", "weekly");
        addUrl(sitemap, BASE_URL + "/apiPage", "0.8", "monthly");
        addUrl(sitemap, BASE_URL + "/trendchat", "0.8", "daily");
        addUrl(sitemap, BASE_URL + "/physics-quiz", "0.8", "monthly");
        addUrl(sitemap, BASE_URL + "/conflux", "0.7", "monthly");

        // CommandStack 페이지
        addUrl(sitemap, BASE_URL + "/commandstack", "0.9", "weekly");
        addUrl(sitemap, BASE_URL + "/commandstack/download", "0.85", "weekly");

        // API 실험실 페이지
        addUrl(sitemap, BASE_URL + "/api-experiment", "0.7", "monthly");
        addUrl(sitemap, BASE_URL + "/api-experiment/rest", "0.6", "monthly");
        addUrl(sitemap, BASE_URL + "/api-experiment/json", "0.6", "monthly");
        addUrl(sitemap, BASE_URL + "/api-experiment/soap", "0.6", "monthly");
        addUrl(sitemap, BASE_URL + "/api-experiment/grpc", "0.6", "monthly");
        addUrl(sitemap, BASE_URL + "/api-experiment/graphql", "0.6", "monthly");

        sitemap.append("</urlset>");
        return sitemap.toString();
    }

    private void addUrl(StringBuilder sitemap, String loc, String priority, String changefreq) {
        sitemap.append("  <url>\n");
        sitemap.append("    <loc>").append(loc).append("</loc>\n");
        sitemap.append("    <changefreq>").append(changefreq).append("</changefreq>\n");
        sitemap.append("    <priority>").append(priority).append("</priority>\n");
        sitemap.append("  </url>\n");
    }
}