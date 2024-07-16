package com.hoooon22.devzip.Controller;

import java.sql.Connection;
import java.sql.SQLException;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/test-db")
public class TestDBController {

    @Autowired
    private DataSource dataSource;

    @GetMapping
    public String testDBConnection() {
        try (Connection connection = dataSource.getConnection()) {
            return "Database connection successful!";
        } catch (SQLException e) {
            e.printStackTrace();
            return "Failed to connect to database.";
        }
    }
}
