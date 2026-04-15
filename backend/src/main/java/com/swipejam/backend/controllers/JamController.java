package com.swipejam.backend.controllers;

import com.swipejam.backend.dtos.JamHistoryDto;
import com.swipejam.backend.dtos.JamResponseDto;
import com.swipejam.backend.dtos.JoinJamRequestDto;
import com.swipejam.backend.entities.User;
import com.swipejam.backend.repositories.UserRepository;
import com.swipejam.backend.services.JamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/jams")
@RequiredArgsConstructor
public class JamController {

    private final JamService jamService;
    private final UserRepository userRepository;

    private User fetchUserOrThrow(OAuth2User principal) {
        if (principal == null) throw new IllegalArgumentException("Unauthorized");
        String spotifyId = principal.getAttribute("id");
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
        } catch (Exception e) {
            return ResponseEntity.status(401).build();
        }
    }
}
