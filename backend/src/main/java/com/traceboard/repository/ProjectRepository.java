package com.traceboard.repository;

import com.traceboard.model.entity.Project;
import com.traceboard.model.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    List<Project> findByUser(User user);
    
    Optional<Project> findByApiKey(String apiKey);
    
    boolean existsByApiKey(String apiKey);
    
    boolean existsByDomain(String domain);
}