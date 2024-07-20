package com.hoooon22.devzip.Model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "Entry")
@Getter
@Setter
@NoArgsConstructor
public class Entry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String content;

    private String ip;

    // Lombok을 사용하여 getter와 setter를 자동 생성합니다.

    // name 필드 추가로 인한 생성자와 getter, setter를 Lombok으로 대체
    public Entry(String name, String content, String ip) {
        this.name = name;
        this.content = content;
        this.ip = ip;
    }

    // 추가 메서드나 로직이 필요하다면 여기에 작성할 수 있습니다.
}
