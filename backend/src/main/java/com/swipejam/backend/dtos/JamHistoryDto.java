package com.swipejam.backend.dtos;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class JamHistoryDto {
    private UUID id;
    private UserDto host;
    private List<SongDto> playedSongs;
    private Instant createdAt;
}
