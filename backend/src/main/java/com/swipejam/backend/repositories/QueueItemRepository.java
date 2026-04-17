package com.swipejam.backend.repositories;

import com.swipejam.backend.entities.QueueItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface QueueItemRepository extends JpaRepository<QueueItem, UUID> {
    List<QueueItem> findByJamIdAndStatus(UUID jamId, QueueItem.QueueStatus status);
    
    Optional<QueueItem> findByJam_IdAndSong_SpotifyId(UUID jamId, String songId);
}
