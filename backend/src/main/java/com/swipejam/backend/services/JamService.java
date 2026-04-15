package com.swipejam.backend.services;

import com.swipejam.backend.dtos.*;
import com.swipejam.backend.entities.*;
import com.swipejam.backend.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JamService {

    private final JamRepository jamRepository;
    private final UserJamRepository userJamRepository;
    private final QueueItemRepository queueItemRepository;

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
}
