package com.swipejam.backend.controllers;

import com.swipejam.backend.dtos.JamHistoryDto;
import com.swipejam.backend.dtos.JamResponseDto;
import com.swipejam.backend.dtos.JoinJamRequestDto;
import com.swipejam.backend.entities.User;
import com.swipejam.backend.entities.UserJam;
import com.swipejam.backend.entities.UserJamId;
import com.swipejam.backend.repositories.UserJamRepository;
import com.swipejam.backend.repositories.UserRepository;
import com.swipejam.backend.services.JamService;
import com.swipejam.backend.services.SpotifyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/jams")
@RequiredArgsConstructor
public class JamController {

    private final JamService jamService;
    private final UserRepository userRepository;
    private final UserJamRepository userJamRepository;
    private final SpotifyService spotifyService;

    private User fetchUserOrThrow(OAuth2User principal) {
        if (principal == null) throw new IllegalArgumentException("Unauthorized");
        String spotifyId = principal.getAttribute("id");
        if (spotifyId == null) throw new IllegalArgumentException("Unauthorized");
        return userRepository.findBySpotifyId(spotifyId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    @PostMapping("/create")
    public ResponseEntity<?> createJam(@AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = fetchUserOrThrow(principal);
            return ResponseEntity.ok(jamService.createJam(user));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping("/join")
    public ResponseEntity<?> joinJam(@AuthenticationPrincipal OAuth2User principal, 
                                     @RequestBody JoinJamRequestDto request) {
        try {
            User user = fetchUserOrThrow(principal);
            return ResponseEntity.ok(jamService.joinJam(user, request.getCode()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body("Invalid code");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/history")
    public ResponseEntity<List<JamHistoryDto>> getHistory(@AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = fetchUserOrThrow(principal);
            return ResponseEntity.ok(jamService.getUserJamHistory(user));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).build();
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActiveJam(@AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = fetchUserOrThrow(principal);
            JamResponseDto activeJam = jamService.getActiveJam(user);
            if (activeJam != null) {
                return ResponseEntity.ok(activeJam);
            }
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/leave")
    public ResponseEntity<?> leaveJam(@AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = fetchUserOrThrow(principal);
            jamService.leaveJam(user);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getJam(@PathVariable UUID id, @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = fetchUserOrThrow(principal);
            UserJamId userJamId = new UserJamId(id, user.getId());
            UserJam membership = userJamRepository.findById(userJamId)
                    .orElseThrow(() -> new IllegalArgumentException("Not a member of this Jam"));
            if (!membership.getActive()) throw new IllegalArgumentException("Not an active member of this Jam");
            return ResponseEntity.ok(jamService.getJamDetails(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @PutMapping("/{id}/settings")
    public ResponseEntity<?> updateJamSettings(@PathVariable java.util.UUID id, 
                                               @RequestBody com.swipejam.backend.dtos.JamSettingsDto request, 
                                               @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = fetchUserOrThrow(principal);
            return ResponseEntity.ok(jamService.updateJamSettings(id, user, request));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/{id}/queue")
    public ResponseEntity<List<com.swipejam.backend.dtos.QueueItemDto>> getJamQueue(@PathVariable UUID id, @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = fetchUserOrThrow(principal);
            UserJamId userJamId = new UserJamId(id, user.getId());
            UserJam membership = userJamRepository.findById(userJamId)
                    .orElseThrow(() -> new IllegalArgumentException("Not a member of this Jam"));
            if (!membership.getActive()) throw new IllegalArgumentException("Not an active member");
            return ResponseEntity.ok(jamService.getJamQueue(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(null);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/spotify/search")
    public ResponseEntity<?> searchSpotify(@RequestParam String q, @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = fetchUserOrThrow(principal);
            return ResponseEntity.ok(spotifyService.searchSongs(user, q));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/spotify/playlists")
    public ResponseEntity<?> getUserPlaylists(@AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = fetchUserOrThrow(principal);
            return ResponseEntity.ok(spotifyService.getUserPlaylists(user));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/{id}/queue/song")
    public ResponseEntity<?> addSongToQueue(@PathVariable java.util.UUID id, @RequestParam String spotifyId, @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = fetchUserOrThrow(principal);
            jamService.addSongToQueue(id, user, spotifyId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/{id}/queue/playlist")
    public ResponseEntity<?> addPlaylistToQueue(@PathVariable java.util.UUID id, @RequestParam String playlistId, @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = fetchUserOrThrow(principal);
            jamService.addPlaylistToQueue(id, user, playlistId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/{id}/player/play")
    public ResponseEntity<?> playJam(@PathVariable java.util.UUID id, @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = fetchUserOrThrow(principal);
            jamService.playJam(id, user);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/{id}/player/pause")
    public ResponseEntity<?> pauseJam(@PathVariable java.util.UUID id, @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = fetchUserOrThrow(principal);
            jamService.pauseJam(id, user);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/{id}/player/skip")
    public ResponseEntity<?> skipNextJam(@PathVariable java.util.UUID id, @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = fetchUserOrThrow(principal);
            jamService.skipNext(id, user);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @PutMapping("/spotify/transfer")
    public ResponseEntity<?> transferPlayback(@RequestParam String deviceId, @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = fetchUserOrThrow(principal);
            spotifyService.transferPlayback(user, deviceId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @PutMapping("/{id}/player/seek")
    public ResponseEntity<?> seekJam(@PathVariable java.util.UUID id, @RequestParam int positionMs, @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = fetchUserOrThrow(principal);
            jamService.seekPlayback(id, user, positionMs);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/{id}/player/previous")
    public ResponseEntity<?> previousJam(@PathVariable java.util.UUID id, @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = fetchUserOrThrow(principal);
            jamService.seekPlayback(id, user, 0);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }
}
