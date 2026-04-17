package com.swipejam.backend.dtos;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class QueueItemDto {
    private UUID id;
    private SongDto song;
    private Integer score;
    private Boolean superliked;
    private String status;
}
