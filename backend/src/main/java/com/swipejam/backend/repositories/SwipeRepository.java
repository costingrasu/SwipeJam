package com.swipejam.backend.repositories;

import com.swipejam.backend.entities.Swipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SwipeRepository extends JpaRepository<Swipe, UUID> {

    boolean existsByJam_IdAndUser_IdAndSong_SpotifyId(UUID jamId, UUID userId, String songSpotifyId);

    @Query("SELECT s.song.spotifyId FROM Swipe s WHERE s.jam.id = :jamId AND s.user.id = :userId")
    List<String> findSwipedSongIdsByJamIdAndUserId(@Param("jamId") UUID jamId, @Param("userId") UUID userId);
}
