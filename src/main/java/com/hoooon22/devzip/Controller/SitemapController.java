package com.hoooon22.devzip.Controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SitemapController {

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public String getSitemap() {
        StringBuilder sitemap = new StringBuilder();
        sitemap.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sitemap.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        // 메인 페이지 추가
        addUrl(sitemap, "https://devzip.site", "1.0");

        // 하위 디렉토리 자동 추가
        String[] subDirectories = {"/", "/Guestbook", "/Joke", "/lolPatch", "/error"};
        for (String dir : subDirectories) {
            addUrl(sitemap, "https://devzip.site/" + dir, "0.8");
        }

        sitemap.append("</urlset>");
        return sitemap.toString();
    }

    private void addUrl(StringBuilder sitemap, String loc, String priority) {
        sitemap.append("  <url>\n");
        sitemap.append("    <loc>").append(loc).append("</loc>\n");
        sitemap.append("    <priority>").append(priority).append("</priority>\n");
        sitemap.append("  </url>\n");
    }
}