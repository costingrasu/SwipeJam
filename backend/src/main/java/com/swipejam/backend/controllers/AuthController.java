package com.swipejam.backend.controllers;

import com.swipejam.backend.dtos.UserDto;
import com.swipejam.backend.entities.User;
import com.swipejam.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(@AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        
        String spotifyId = principal.getAttribute("id");
        Optional<User> userOptional = userRepository.findBySpotifyId(spotifyId);
        
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            return ResponseEntity.ok(UserDto.builder()
                    .id(user.getId())
                    .name(user.getName())
                    .profileImg(user.getProfileImg())
                    .build());
        }
        
        return ResponseEntity.status(401).build();
    }
}
