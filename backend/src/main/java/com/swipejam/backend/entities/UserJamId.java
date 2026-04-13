package com.swipejam.backend.entities;

import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserJamId implements Serializable {
    private UUID jamId;
    private UUID userId;
}
