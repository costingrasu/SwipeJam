package com.swipejam.backend.entities;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(
    name = "queue", 
    uniqueConstraints = @UniqueConstraint(columnNames = {"jam_id", "song_id"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QueueItem {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "jam_id", nullable = false)
    private Jam jam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "song_id", nullable = false)
    private Song song;

    @Column(nullable = false)
    private Integer score = 0;

    @Column(nullable = false)
    private Boolean superliked = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QueueStatus status = QueueStatus.NOT_PLAYED;

    public enum QueueStatus {
        NOT_PLAYED,
        PLAYED
    }
}
