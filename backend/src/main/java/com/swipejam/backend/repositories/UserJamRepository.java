package com.swipejam.backend.repositories;

import com.swipejam.backend.entities.UserJam;
import com.swipejam.backend.entities.UserJamId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserJamRepository extends JpaRepository<UserJam, UserJamId> {
    List<UserJam> findByUserId(UUID userId);
}
