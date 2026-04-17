package com.swipejam.backend.dtos;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PlaylistDto {
    private String id;
    private String name;
    private String coverUrl;
    private Integer totalTracks;
}
