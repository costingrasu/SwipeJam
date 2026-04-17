package com.swipejam.backend.dtos;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonInclude;

@Data
@Builder
public class JamDto {
    private UUID id;
    private String accessCode;
    private UserDto host;
    private Boolean syncedAudio;
    private SongDto currentSong;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Integer positionMs;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Boolean isPlaying;
}
