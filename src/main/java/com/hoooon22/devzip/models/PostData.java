package com.hoooon22.devzip.models;

// PostData.java

public class PostData {
    private String author;  // 작성자 이름
    private String content; // 게시물 내용
    private String ip;      // 클라이언트 IP 주소

    // 생성자 (기본 생성자와 매개변수 있는 생성자)
    public PostData() {
    }

    public PostData(String author, String content, String ip) {
        this.author = author;
        this.content = content;
        this.ip = ip;
    }

    // Getter 및 Setter 메서드
    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getIp() {
        return ip;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }
}
