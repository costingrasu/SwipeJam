package com.swipejam.backend.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "songs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Song {
    @Id
    @Column(name = "spotify_id")
    private String spotifyId;

    private String title;
    
    private String artist;
    
    @Column(name = "cover_url")
    private String coverUrl;
    
    @Column(name = "preview_url")
    private String previewUrl;
}
