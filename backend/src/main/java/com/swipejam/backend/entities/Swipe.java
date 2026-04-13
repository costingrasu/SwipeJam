package com.swipejam.backend.entities;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(
    name = "swipes", 
    uniqueConstraints = @UniqueConstraint(columnNames = {"jam_id", "user_id", "song_id"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Swipe {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "jam_id", nullable = false)
    private Jam jam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "song_id", nullable = false)
    private Song song;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VoteType vote;

    public enum VoteType {
        LIKE,
        DISLIKE,
        SUPERLIKE
    }
}
