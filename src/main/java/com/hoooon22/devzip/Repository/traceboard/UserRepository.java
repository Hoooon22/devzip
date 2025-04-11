package com.hoooon22.devzip.Repository.traceboard;

import com.hoooon22.devzip.Model.traceboard.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);
    
    boolean existsByEmail(String email);
} 