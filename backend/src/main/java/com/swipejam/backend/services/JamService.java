package com.swipejam.backend.services;

import com.swipejam.backend.dtos.*;
import com.swipejam.backend.entities.*;
import com.swipejam.backend.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Random;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JamService {

    private final JamRepository jamRepository;
    private final UserJamRepository userJamRepository;
    private final QueueItemRepository queueItemRepository;
    private final SongRepository songRepository;
    private final SpotifyService spotifyService;
    private final SimpMessagingTemplate messagingTemplate;

    private String generateUniqueAccessCode() {
        String characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        Random random = new Random();
        String code;
        do {
            StringBuilder sb = new StringBuilder(6);
            for(int i = 0; i < 6; i++) {
                sb.append(characters.charAt(random.nextInt(characters.length())));
            }
            code = sb.toString();
        } while (jamRepository.existsByAccessCode(code));
        return code;
    }

    @Transactional
    public JamResponseDto createJam(User host) {
        String accessCode = generateUniqueAccessCode();
        
        Jam jam = Jam.builder()
                .host(host)
                .accessCode(accessCode)
                .syncedAudio(false)
                .createdAt(java.time.Instant.now())
                .build();
                
        jam = jamRepository.save(jam);

        UserJamId id = new UserJamId(jam.getId(), host.getId());
        UserJam userJam = UserJam.builder()
                .id(id)
                .jam(jam)
                .user(host)
                .active(true)
                .usedSuperlike(false)
                .joinedAt(java.time.Instant.now())
                .build();
                
        userJamRepository.save(userJam);

        return JamResponseDto.builder()
                .id(jam.getId())
                .accessCode(jam.getAccessCode())
                .build();
    }

    @Transactional
    public JamResponseDto joinJam(User participant, String accessCode) {
        Jam jam = jamRepository.findByAccessCode(accessCode)
                .orElseThrow(() -> new IllegalArgumentException("Invalid Jam Code"));

        UserJamId hostId = new UserJamId(jam.getId(), jam.getHost().getId());
        userJamRepository.findById(hostId).ifPresent(hostJam -> {
            if (!hostJam.getActive()) {
                throw new IllegalArgumentException("Jam has ended");
            }
        });

        UserJamId id = new UserJamId(jam.getId(), participant.getId());
        
        userJamRepository.findById(id).ifPresentOrElse(
            userJam -> {
                userJam.setActive(true);
                userJamRepository.save(userJam);
            },
            () -> {
                UserJam userJam = UserJam.builder()
                        .id(id)
                        .jam(jam)
                        .user(participant)
                        .active(true)
                        .usedSuperlike(false)
                        .joinedAt(java.time.Instant.now())
                        .build();
                userJamRepository.save(userJam);
            }
        );

        return JamResponseDto.builder()
                .id(jam.getId())
                .accessCode(jam.getAccessCode())
                .build();
    }

    @Transactional(readOnly = true)
    public List<JamHistoryDto> getUserJamHistory(User user) {
        List<UserJam> userJams = userJamRepository.findByUserId(user.getId());
        
        return userJams.stream().map(uj -> {
            Jam jam = uj.getJam();
            User host = jam.getHost();
            
            List<QueueItem> playedItems = queueItemRepository.findByJamIdAndStatus(jam.getId(), QueueItem.QueueStatus.PLAYED);
            
            List<SongDto> songs = playedItems.stream()
                .map(QueueItem::getSong)
                .map(s -> SongDto.builder()
                        .spotifyId(s.getSpotifyId())
                        .title(s.getTitle())
                        .artist(s.getArtist())
                        .coverUrl(s.getCoverUrl())
                        .build())
                .collect(Collectors.toList());

            return JamHistoryDto.builder()
                    .id(jam.getId())
                    .host(UserDto.builder()
                            .id(host.getId())
                            .name(host.getName())
                            .profileImg(host.getProfileImg())
                            .build())
                    .playedSongs(songs)
                    .createdAt(jam.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public JamResponseDto getActiveJam(User user) {
        return userJamRepository.findByUserId(user.getId()).stream()
                .filter(UserJam::getActive)
                .findFirst()
                .map(uj -> JamResponseDto.builder()
                        .id(uj.getJam().getId())
                        .accessCode(uj.getJam().getAccessCode())
                        .build())
                .orElse(null);
    }

    @Transactional
    public void leaveJam(User user) {
        userJamRepository.findByUserId(user.getId()).stream()
                .filter(UserJam::getActive)
                .findFirst()
                .ifPresent(uj -> {
                    Jam jam = uj.getJam();
                    if (jam.getHost().getId().equals(user.getId())) {
                        userJamRepository.findByJamIdAndActiveTrue(jam.getId())
                            .forEach(activeUj -> {
                                activeUj.setActive(false);
                                userJamRepository.save(activeUj);
                            });
                        spotifyService.pausePlayback(jam.getHost());
                    } else {
                        uj.setActive(false);
                        userJamRepository.save(uj);
                    }
                });
    }

    @Transactional(readOnly = true)
    public JamDto getJamDetails(UUID jamId) {
        Jam jam = jamRepository.findById(jamId)
                .orElseThrow(() -> new IllegalArgumentException("Jam not found"));

        User host = jam.getHost();
        Song s = jam.getCurrentSong();
        SongDto songDto = s != null ? SongDto.builder()
                .spotifyId(s.getSpotifyId())
                .title(s.getTitle())
                .artist(s.getArtist())
                .coverUrl(s.getCoverUrl())
                .previewUrl(s.getPreviewUrl())
                .durationMs(s.getDurationMs())
                .build() : null;

        Integer positionMs = 0;
        Boolean isPlaying = false;
        if (s != null) {
            java.util.Map<String, Object> state = spotifyService.getPlaybackState(host);
            if (state != null) {
                positionMs = (Integer) state.get("progressMs");
                isPlaying = (Boolean) state.get("isPlaying");
            }
        }

        return JamDto.builder()
                .id(jam.getId())
                .accessCode(jam.getAccessCode())
                .syncedAudio(jam.getSyncedAudio())
                .currentSong(songDto)
                .positionMs(positionMs)
                .isPlaying(isPlaying)
                .host(UserDto.builder()
                        .id(host.getId())
                        .name(host.getName())
                        .profileImg(host.getProfileImg())
                        .build())
                .build();
    }

    @Transactional
    public JamDto updateJamSettings(UUID jamId, User user, JamSettingsDto settings) {
        Jam jam = jamRepository.findById(jamId)
                .orElseThrow(() -> new IllegalArgumentException("Jam not found"));

        if (!jam.getHost().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Only host can update settings");
        }

        if (settings.getSyncedAudio() != null) {
            jam.setSyncedAudio(settings.getSyncedAudio());
        }

        jam = jamRepository.save(jam);
        return getJamDetails(jamId);
    }

    @Transactional(readOnly = true)
    public List<QueueItemDto> getJamQueue(UUID jamId) {
        List<QueueItem> items = queueItemRepository.findByJamIdAndStatus(jamId, QueueItem.QueueStatus.NOT_PLAYED);
        
        items.sort((a, b) -> {
            if (a.getSuperliked() && !b.getSuperliked()) return -1;
            if (!a.getSuperliked() && b.getSuperliked()) return 1;
            return b.getScore().compareTo(a.getScore());
        });

        return items.stream().map(qi -> {
            Song s = qi.getSong();
            SongDto songDto = SongDto.builder()
                    .spotifyId(s.getSpotifyId())
                    .title(s.getTitle())
                    .artist(s.getArtist())
                    .coverUrl(s.getCoverUrl())
                    .previewUrl(s.getPreviewUrl())
                    .durationMs(s.getDurationMs())
                    .build();

            return QueueItemDto.builder()
                    .id(qi.getId())
                    .song(songDto)
                    .score(qi.getScore())
                    .superliked(qi.getSuperliked())
                    .status(qi.getStatus().name())
                    .build();
        }).collect(Collectors.toList());
    }

    private JamDto buildBroadcastDto(Jam jam, Boolean isPlaying, Integer positionMs) {
        Song s = jam.getCurrentSong();
        User host = jam.getHost();
        SongDto songDto = s != null ? SongDto.builder()
                .spotifyId(s.getSpotifyId())
                .title(s.getTitle())
                .artist(s.getArtist())
                .coverUrl(s.getCoverUrl())
                .previewUrl(s.getPreviewUrl())
                .durationMs(s.getDurationMs())
                .build() : null;
        return JamDto.builder()
                .id(jam.getId())
                .accessCode(jam.getAccessCode())
                .syncedAudio(jam.getSyncedAudio())
                .currentSong(songDto)
                .positionMs(positionMs)
                .isPlaying(isPlaying)
                .host(UserDto.builder()
                        .id(host.getId())
                        .name(host.getName())
                        .profileImg(host.getProfileImg())
                        .build())
                .build();
    }

    @Transactional
    public void addSongToQueue(UUID jamId, User user, String spotifyId) {
        Jam jam = jamRepository.findById(jamId).orElseThrow(() -> new IllegalArgumentException("Jam not found"));
        
        Song song = songRepository.findBySpotifyId(spotifyId).orElseGet(() -> {
            SongDto dto = spotifyService.getTrack(user, spotifyId);
            return songRepository.save(Song.builder()
                    .spotifyId(dto.getSpotifyId())
                    .title(dto.getTitle())
                    .artist(dto.getArtist())
                    .coverUrl(dto.getCoverUrl())
                    .previewUrl(dto.getPreviewUrl())
                    .durationMs(dto.getDurationMs())
                    .build());
        });

        if (jam.getCurrentSong() == null) {
            jam.setCurrentSong(song);
            jamRepository.save(jam);
            QueueItem firstItem = QueueItem.builder()
                    .jam(jam)
                    .song(song)
                    .score(0)
                    .superliked(false)
                    .status(QueueItem.QueueStatus.PLAYED)
                    .build();
            queueItemRepository.save(firstItem);
            messagingTemplate.convertAndSend("/topic/jam/" + jamId + "/state", buildBroadcastDto(jam, false, 0));
        } else {
            if (queueItemRepository.findByJam_IdAndSong_SpotifyId(jamId, spotifyId).isEmpty()) {
                QueueItem item = QueueItem.builder()
                        .jam(jam)
                        .song(song)
                        .score(0)
                        .superliked(false)
                        .status(QueueItem.QueueStatus.NOT_PLAYED)
                        .build();
                queueItemRepository.save(item);
            }
        }
        messagingTemplate.convertAndSend("/topic/jam/" + jamId + "/queue", getJamQueue(jamId));
    }

    @Transactional
    public void addPlaylistToQueue(UUID jamId, User user, String playlistId) {
        Jam jam = jamRepository.findById(jamId).orElseThrow(() -> new IllegalArgumentException("Jam not found"));
        List<SongDto> tracks = spotifyService.getPlaylistTracks(user, playlistId);
        
        java.util.Collections.shuffle(tracks);

        for (SongDto dto : tracks) {
            Song song = songRepository.findBySpotifyId(dto.getSpotifyId()).orElseGet(() -> {
                return songRepository.save(Song.builder()
                        .spotifyId(dto.getSpotifyId())
                        .title(dto.getTitle())
                        .artist(dto.getArtist())
                        .coverUrl(dto.getCoverUrl())
                        .previewUrl(dto.getPreviewUrl())
                        .durationMs(dto.getDurationMs())
                        .build());
            });

            if (jam.getCurrentSong() == null) {
                jam.setCurrentSong(song);
                jamRepository.save(jam);
                QueueItem firstItem = QueueItem.builder()
                        .jam(jam)
                        .song(song)
                        .score(0)
                        .superliked(false)
                        .status(QueueItem.QueueStatus.PLAYED)
                        .build();
                queueItemRepository.save(firstItem);
                messagingTemplate.convertAndSend("/topic/jam/" + jamId + "/state", buildBroadcastDto(jam, false, 0));
            } else {
                if (queueItemRepository.findByJam_IdAndSong_SpotifyId(jamId, song.getSpotifyId()).isEmpty()) {
                    QueueItem item = QueueItem.builder()
                            .jam(jam)
                            .song(song)
                            .score(0)
                            .superliked(false)
                            .status(QueueItem.QueueStatus.NOT_PLAYED)
                            .build();
                    queueItemRepository.save(item);
                }
            }
        }
        messagingTemplate.convertAndSend("/topic/jam/" + jamId + "/queue", getJamQueue(jamId));
    }

    @Transactional
    public void playJam(UUID jamId, User user) {
        Jam jam = jamRepository.findById(jamId).orElseThrow(() -> new IllegalArgumentException("Jam not found"));
        
        if (jam.getCurrentSong() != null) {
            java.util.Map<String, Object> state = spotifyService.getPlaybackState(jam.getHost());
            String activeTrackId = state != null ? (String) state.get("trackId") : null;
            boolean matchingTrack = activeTrackId != null && activeTrackId.equals(jam.getCurrentSong().getSpotifyId());
            
            if (jam.getSyncedAudio()) {
                List<com.swipejam.backend.entities.UserJam> activeJams = userJamRepository.findByJamIdAndActiveTrue(jamId);
                for (com.swipejam.backend.entities.UserJam uj : activeJams) {
                     if (matchingTrack) spotifyService.resumePlayback(uj.getUser());
                     else spotifyService.playTrack(uj.getUser(), jam.getCurrentSong().getSpotifyId());
                }
            } else {
                if (matchingTrack) spotifyService.resumePlayback(jam.getHost());
                else spotifyService.playTrack(jam.getHost(), jam.getCurrentSong().getSpotifyId());
            }

            messagingTemplate.convertAndSend("/topic/jam/" + jamId + "/state", buildBroadcastDto(jam, true, null));
        }
    }

    @Transactional
    public void seekPlayback(UUID jamId, User user, int positionMs) {
        Jam jam = jamRepository.findById(jamId).orElseThrow(() -> new IllegalArgumentException("Jam not found"));
        if (!jam.getHost().getId().equals(user.getId())) throw new IllegalArgumentException("Only host can control playback");
        
        if (jam.getSyncedAudio()) {
            List<com.swipejam.backend.entities.UserJam> activeJams = userJamRepository.findByJamIdAndActiveTrue(jamId);
            for (com.swipejam.backend.entities.UserJam uj : activeJams) {
                 spotifyService.seekPosition(uj.getUser(), positionMs);
            }
        } else {
            spotifyService.seekPosition(jam.getHost(), positionMs);
        }

        messagingTemplate.convertAndSend("/topic/jam/" + jamId + "/state", buildBroadcastDto(jam, null, positionMs));
    }

    @Transactional
    public void pauseJam(UUID jamId, User user) {
        Jam jam = jamRepository.findById(jamId).orElseThrow(() -> new IllegalArgumentException("Jam not found"));
        
        if (jam.getSyncedAudio()) {
            List<com.swipejam.backend.entities.UserJam> activeJams = userJamRepository.findByJamIdAndActiveTrue(jamId);
            for (com.swipejam.backend.entities.UserJam uj : activeJams) {
                 spotifyService.pausePlayback(uj.getUser());
            }
        } else {
            spotifyService.pausePlayback(jam.getHost());
        }

        messagingTemplate.convertAndSend("/topic/jam/" + jamId + "/state", buildBroadcastDto(jam, false, null));
    }

    @Transactional
    public void skipNext(UUID jamId, User user) {
        Jam jam = jamRepository.findById(jamId).orElseThrow(() -> new IllegalArgumentException("Jam not found"));
        if (!jam.getHost().getId().equals(user.getId())) throw new IllegalArgumentException("Only host can control playback");
        
        if (jam.getCurrentSong() != null) {
            queueItemRepository.findByJam_IdAndSong_SpotifyId(jamId, jam.getCurrentSong().getSpotifyId())
                .ifPresent(qi -> {
                    qi.setStatus(QueueItem.QueueStatus.PLAYED);
                    queueItemRepository.save(qi);
                });
        }
        
        List<QueueItem> items = queueItemRepository.findByJamIdAndStatus(jamId, QueueItem.QueueStatus.NOT_PLAYED);
        if (!items.isEmpty()) {
            items.sort((a, b) -> {
                if (a.getSuperliked() && !b.getSuperliked()) return -1;
                if (!a.getSuperliked() && b.getSuperliked()) return 1;
                return b.getScore().compareTo(a.getScore());
            });
            
            QueueItem nextItem = items.get(0);
            jam.setCurrentSong(nextItem.getSong());
            nextItem.setStatus(QueueItem.QueueStatus.PLAYED);
            queueItemRepository.save(nextItem);
            jamRepository.save(jam);
            
            if (jam.getSyncedAudio()) {
                List<com.swipejam.backend.entities.UserJam> activeJams = userJamRepository.findByJamIdAndActiveTrue(jamId);
                for (com.swipejam.backend.entities.UserJam uj : activeJams) {
                     spotifyService.playTrack(uj.getUser(), nextItem.getSong().getSpotifyId());
                }
            } else {
                spotifyService.playTrack(jam.getHost(), nextItem.getSong().getSpotifyId());
            }
        } else {
            jam.setCurrentSong(null);
            jamRepository.save(jam);
            if (jam.getSyncedAudio()) {
                userJamRepository.findByJamIdAndActiveTrue(jamId)
                    .forEach(uj -> spotifyService.pausePlayback(uj.getUser()));
            } else {
                spotifyService.pausePlayback(jam.getHost());
            }
        }
        
        messagingTemplate.convertAndSend("/topic/jam/" + jamId + "/queue", getJamQueue(jamId));
        messagingTemplate.convertAndSend("/topic/jam/" + jamId + "/state",
                buildBroadcastDto(jam, jam.getCurrentSong() != null, 0));
    }
}
