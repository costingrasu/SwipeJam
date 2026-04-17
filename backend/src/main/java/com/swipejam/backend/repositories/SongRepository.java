package com.swipejam.backend.repositories;

import com.swipejam.backend.entities.Song;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SongRepository extends JpaRepository<Song, String> {
    Optional<Song> findBySpotifyId(String spotifyId);
}
