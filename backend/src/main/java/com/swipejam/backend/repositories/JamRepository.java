package com.swipejam.backend.repositories;

import com.swipejam.backend.entities.Jam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface JamRepository extends JpaRepository<Jam, UUID> {
    Optional<Jam> findByAccessCode(String accessCode);
    boolean existsByAccessCode(String accessCode);
}
