// Entry.java
package com.hoooon22.devzip.Model;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "Entry")
public class Entry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "이름을 입력해주세요")
    @Size(max = 100, message = "이름은 100자 이하로 입력해주세요")
    @Column(nullable = false, length = 100)
    private String name;

    @NotBlank(message = "내용을 입력해주세요")
    @Size(max = 1000, message = "내용은 1000자 이하로 입력해주세요")
    @Column(nullable = false, length = 1000)
    private String content;

    @JsonIgnore // JSON 응답에서 IP 주소를 숨김
    @Column(length = 45)
    private String ip;

    @Column(length = 7)
    private String color;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createDate;

    // getters and setters (Lombok 등을 사용해 자동 생성)

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    @JsonIgnore // JSON 응답에서 IP getter를 숨김
    public String getIp() {
        return ip;
    }

    @JsonIgnore // JSON 요청에서 IP setter를 숨김
    public void setIp(String ip) {
        this.ip = ip;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public LocalDateTime getCreateDate() {
        return createDate;
    }

    public void setCreateDate(LocalDateTime createDate) {
        this.createDate = createDate;
    }

    public String getFormattedCreateDate() {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        return createDate.format(formatter);
    }
}
