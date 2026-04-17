package com.swipejam.backend.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.swipejam.backend.dtos.PlaylistDto;
import com.swipejam.backend.dtos.SongDto;
import com.swipejam.backend.entities.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SpotifyService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final com.swipejam.backend.repositories.UserRepository userRepository;

    @org.springframework.beans.factory.annotation.Value("${spring.security.oauth2.client.registration.spotify.client-id}")
    private String spotifyClientId;

    @org.springframework.beans.factory.annotation.Value("${spring.security.oauth2.client.registration.spotify.client-secret}")
    private String spotifyClientSecret;

    private HttpHeaders createHeaders(User user) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(user.getAccessToken());
        return headers;
    }

    public List<SongDto> searchSongs(User user, String query) {
        String url = "https://api.spotify.com/v1/search?q=" + URLEncoder.encode(query, StandardCharsets.UTF_8) + "&type=track&limit=10";
        HttpEntity<String> entity = new HttpEntity<>(createHeaders(user));
        
        List<SongDto> songs = new ArrayList<>();
        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            if (response.getBody() == null) return songs;
            
            JsonNode root = objectMapper.readTree(response.getBody());
            if (root.has("tracks") && root.get("tracks").has("items")) {
                JsonNode items = root.get("tracks").get("items");
                for (JsonNode item : items) {
                    songs.add(parseSongNode(item));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return songs;
    }

    public List<PlaylistDto> getUserPlaylists(User user) {
        String url = "https://api.spotify.com/v1/me/playlists?limit=50";
        HttpEntity<String> entity = new HttpEntity<>(createHeaders(user));
        
        List<PlaylistDto> playlists = new ArrayList<>();
        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            if (response.getBody() == null) return playlists;

            JsonNode root = objectMapper.readTree(response.getBody());
            if (root.has("items")) {
                JsonNode items = root.get("items");
                for (JsonNode item : items) {
                    if (item.isNull() || item.get("id") == null) continue;
                    String coverUrl = item.has("images") && item.get("images").size() > 0 
                            ? item.get("images").get(0).get("url").asText() : "";
                    int totalTracks = 0;
                    if (item.has("tracks") && item.get("tracks").has("total")) totalTracks = item.get("tracks").get("total").asInt(0);
                    else if (item.has("items") && item.get("items").has("total")) totalTracks = item.get("items").get("total").asInt(0);
                    
                    playlists.add(PlaylistDto.builder()
                            .id(item.get("id").asText())
                            .name(item.get("name").asText())
                            .coverUrl(coverUrl)
                            .totalTracks(totalTracks)
                            .build());
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return playlists;
    }

    public List<SongDto> getPlaylistTracks(User user, String playlistId) {
        String url = "https://api.spotify.com/v1/playlists/" + playlistId + "/items?limit=50";
        HttpEntity<String> entity = new HttpEntity<>(createHeaders(user));
        
        List<SongDto> songs = new ArrayList<>();
        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            if (response.getBody() == null) return songs;

            JsonNode root = objectMapper.readTree(response.getBody());
            if (root.has("items")) {
                JsonNode items = root.get("items");
                for (JsonNode itemWrapper : items) {
                    JsonNode trackNode = null;
                    if (itemWrapper.has("item") && !itemWrapper.get("item").isNull()) {
                        trackNode = itemWrapper.get("item");
                    } else if (itemWrapper.has("track") && !itemWrapper.get("track").isNull()) {
                        trackNode = itemWrapper.get("track");
                    }
                    
                    if (trackNode != null && trackNode.has("id")) {
                        songs.add(parseSongNode(trackNode));
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("CRITICAL SPOTIFY FETCH ERROR: " + e.getMessage());
            e.printStackTrace();
        }
        return songs;
    }

    public void transferPlayback(User user, String deviceId) {
        String url = "https://api.spotify.com/v1/me/player";
        HttpHeaders headers = createHeaders(user);
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        String body = "{\"device_ids\": [\"" + deviceId + "\"], \"play\": false}";
        HttpEntity<String> entity = new HttpEntity<>(body, headers);
        try {
            restTemplate.exchange(url, HttpMethod.PUT, entity, String.class);
        } catch (Exception e) {
            System.err.println("Failed to transfer playback: " + e.getMessage());
        }
    }

    public void playTrack(User user, String trackId) {
        String url = "https://api.spotify.com/v1/me/player/play";
        HttpHeaders headers = createHeaders(user);
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        
        String body = "{\"uris\": [\"spotify:track:" + trackId + "\"]}";
        HttpEntity<String> entity = new HttpEntity<>(body, headers);
        
        try {
            restTemplate.exchange(url, HttpMethod.PUT, entity, String.class);
        } catch (Exception e) {
            System.err.println("Failed to start playback: " + e.getMessage());
        }
    }

    public void pausePlayback(User user) {
        String url = "https://api.spotify.com/v1/me/player/pause";
        HttpEntity<String> entity = new HttpEntity<>(createHeaders(user));
        
        try {
            restTemplate.exchange(url, HttpMethod.PUT, entity, String.class);
        } catch (Exception e) {
            System.err.println("Failed to pause playback: " + e.getMessage());
        }
    }

    public void resumePlayback(User user) {
        String url = "https://api.spotify.com/v1/me/player/play";
        HttpEntity<String> entity = new HttpEntity<>(createHeaders(user));
        
        try {
            restTemplate.exchange(url, HttpMethod.PUT, entity, String.class);
        } catch (Exception e) {
            System.err.println("Failed to resume playback: " + e.getMessage());
        }
    }

    public java.util.Map<String, Object> getPlaybackState(User user) {
        String url = "https://api.spotify.com/v1/me/player";
        HttpEntity<String> entity = new HttpEntity<>(createHeaders(user));
        try {
            org.springframework.http.ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null && !response.getBody().isEmpty()) {
                com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(response.getBody());
                boolean isPlaying = root.has("is_playing") && root.get("is_playing").asBoolean();
                int progressMs = root.has("progress_ms") ? root.get("progress_ms").asInt() : 0;
                
                String trackId = null;
                if (root.has("item") && !root.get("item").isNull() && root.get("item").has("id")) {
                    trackId = root.get("item").get("id").asText();
                }
                
                java.util.Map<String, Object> state = new java.util.HashMap<>();
                state.put("isPlaying", isPlaying);
                state.put("progressMs", progressMs);
                state.put("trackId", trackId);
                return state;
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch playback state: " + e.getMessage());
        }
        return null;
    }

    public User refreshAccessToken(User user) {
        String url = "https://accounts.spotify.com/api/token";
        HttpHeaders headers = new HttpHeaders();
        String credentials = spotifyClientId + ":" + spotifyClientSecret;
        String encoded = java.util.Base64.getEncoder().encodeToString(
            credentials.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        headers.set("Authorization", "Basic " + encoded);
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED);

        if (user.getRefreshToken() == null) {
            System.err.println("Cannot refresh token: no refresh token stored for user " + user.getSpotifyId());
            return user;
        }

        org.springframework.util.MultiValueMap<String, String> body = new org.springframework.util.LinkedMultiValueMap<>();
        body.add("grant_type", "refresh_token");
        body.add("refresh_token", user.getRefreshToken());

        HttpEntity<org.springframework.util.MultiValueMap<String, String>> entity = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                user.setAccessToken(root.get("access_token").asText());
                if (root.has("refresh_token")) {
                    user.setRefreshToken(root.get("refresh_token").asText());
                }
                return userRepository.save(user);
            }
        } catch (Exception e) {
            System.err.println("Failed to refresh Spotify access token: " + e.getMessage());
        }
        return user;
    }
    
    public SongDto getTrack(User user, String trackId) {
        String url = "https://api.spotify.com/v1/tracks/" + trackId;
        HttpEntity<String> entity = new HttpEntity<>(createHeaders(user));
        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            if (response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                return parseSongNode(root);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        throw new IllegalArgumentException("Track not found");
    }

    public void seekPosition(User user, int positionMs) {
        String url = "https://api.spotify.com/v1/me/player/seek?position_ms=" + positionMs;
        HttpEntity<String> entity = new HttpEntity<>(createHeaders(user));
        
        try {
            restTemplate.exchange(url, HttpMethod.PUT, entity, String.class);
        } catch (Exception e) {
            System.err.println("Failed to seek playback: " + e.getMessage());
        }
    }

    private SongDto parseSongNode(JsonNode item) {
        String coverUrl = item.has("album") && item.get("album").has("images") && item.get("album").get("images").size() > 0 
                ? item.get("album").get("images").get(0).get("url").asText() : "";
        
        StringBuilder artistsBuilder = new StringBuilder();
        if (item.has("artists")) {
            for (JsonNode artistNode : item.get("artists")) {
                if (artistsBuilder.length() > 0) artistsBuilder.append(", ");
                artistsBuilder.append(artistNode.get("name").asText());
            }
        }
        String artist = artistsBuilder.length() > 0 ? artistsBuilder.toString() : "Unknown Artist";
        
        Integer durationMs = item.has("duration_ms") ? item.get("duration_ms").asInt() : 0;
        String previewUrl = item.has("preview_url") && !item.get("preview_url").isNull()
                ? item.get("preview_url").asText() : null;
        
        return SongDto.builder()
                .spotifyId(item.get("id").asText())
                .title(item.get("name").asText())
                .artist(artist)
                .coverUrl(coverUrl)
                .previewUrl(previewUrl)
                .durationMs(durationMs)
                .build();
    }
}
