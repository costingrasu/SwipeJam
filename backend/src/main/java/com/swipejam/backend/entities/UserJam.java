package com.swipejam.backend.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "users_jams")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserJam {

    @EmbeddedId
    private UserJamId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("jamId")
    @JoinColumn(name = "jam_id")
    private Jam jam;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "used_superlike", nullable = false)
    private Boolean usedSuperlike = false;

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt = Instant.now();
}
