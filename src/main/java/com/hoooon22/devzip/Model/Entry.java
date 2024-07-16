package com.hoooon22.devzip.Model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "Entry")
@Getter
@Setter
public class Entry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    private String content;

    private String ip;

    // No need to explicitly define getters and setters, Lombok generates them

    // No need to define constructors, Lombok provides a default no-args constructor

    // You can add additional methods as needed
}
