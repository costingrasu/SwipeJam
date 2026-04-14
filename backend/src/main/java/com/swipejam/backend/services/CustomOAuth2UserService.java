package com.swipejam.backend.services;

import com.swipejam.backend.entities.User;
import com.swipejam.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        
        try {
            return processOAuth2User(userRequest, oAuth2User);
        } catch (Exception ex) {
            log.error("Failed to process OAuth2 User context", ex);
            throw ex;
        }
    }

    private OAuth2User processOAuth2User(OAuth2UserRequest userRequest, OAuth2User oAuth2User) {
        String spotifyId = oAuth2User.getAttribute("id");
        String name = oAuth2User.getAttribute("display_name");
        
        String profileImg = null;
        List<Map<String, Object>> images = oAuth2User.getAttribute("images");
        if (images != null && !images.isEmpty()) {
            profileImg = (String) images.get(0).get("url");
        }

        Optional<User> userOptional = userRepository.findBySpotifyId(spotifyId);
        User user;

        if (userOptional.isPresent()) {
            user = userOptional.get();
            user.setName(name);
            user.setProfileImg(profileImg);
        } else {
            user = User.builder()
                    .spotifyId(spotifyId)
                    .name(name)
                    .profileImg(profileImg)
                    .build();
        }

        userRepository.save(user);
        return oAuth2User;
    }
}
