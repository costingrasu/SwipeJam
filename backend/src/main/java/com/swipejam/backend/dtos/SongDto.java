package com.swipejam.backend.dtos;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SongDto {
    private String spotifyId;
    private String title;
    private String artist;
    private String coverUrl;
}
