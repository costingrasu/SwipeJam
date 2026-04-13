# Project: SwipeJam

## 1. Project Overview
SwipeJam is a gamified collaborative music listening web application. It merges group music playback with a "swipe-to-vote" selection mechanic. Users connect to a shared session, propose reference playlists, and democratically decide the queue order by swiping left or right on 30-second audio previews.

## 2. Technical Stack
- **Frontend:** ReactJS (Tailwind CSS, Framer Motion for swipe animations).
- **Backend:** Java Spring Boot (Spring WebSockets for real-time sync).
- **Database:** PostgreSQL (Relational data & persistence).
- **Integrations:** Spotify Web API (OAuth, Web Playback SDK, Track Metadata).

## 3. Core Features & Navigation
/Login -> landing page for not logged in user. User must login with their Spotify account
/ -> landing page for logged in user. Two options:
1.Create a Jam
2.Join a Jam: Two options:
Insert the jam code / Scan QR code

/jam/{id} -> jam session. This is where the users arrive after either of the previous 2 options of the landing page. Here exists a button “Invite friends” where it gives a popup with the code and qr code of the jam.

The host may chose if the others in the jam are in the same room with him so that the sound will only be heard from the host device or not (in this case each device connected to the jam will have the sound playing).
The jam has 3 states:
1.Player extended. The player, song cover are visible, a queue button (which pressed displayed the current queue) and an add reference button (this button opens a popup in which the user can select from his personal Spotify playlists to be included in the queue.) (How the queue works: upon users adding reference playlists. The app add all the songs from these playlists in the queue, removes the duplicates and shuffles the list).

2.Lyrics state. In this state the only difference between the first state is that instead of the song cover are the lyrics dinamically retrieved of the song. On bottom there is still the player, the queue button and the add reference

3.Swipe the Jam state. In this state the music will be on mute and the swiper will be visible. How this works: It has the song card (title, authors and cover image) and 
if swiped right, the song gets a like and the next song is displayed from the shuffled list
if swiped left, the next song is displayed from the shuffled list and no liked received.
If swiped up, it gets the super like which puts the song the first one in the queue no matter the likes of the other songs(each user gets 1 spearlike per jam)

If the user presses on the song cover, a 30 second preview will play.

## 4. Database Schema (Source of Truth)
users:
id: UUID (PK)
spotify_id: String (UNIQUE)
name: String
access_token: String
refresh_token: String
profile_img: String
Relationships: 1:N with jams (as host), M:N with jams (as participant), 1:N with swipes.

jams:
id: UUID (PK)
host_id: UUID (FK -> users.id)
access_code: String (UNIQUE)
current_song_id: String (FK -> songs.spotify_id, NULLABLE)
synced_audio: Boolean
created_at: Timestamp
Relationships: N:1 with users (host), M:N with users (participants), N:1 with songs, 1:N with queue, 1:N with swipes.

users_jams: (Helper Table)
jam_id: UUID (FK/PK)
user_id: UUID (FK/PK)
used_superlike: Boolean (Default: FALSE)
joined_at: Timestamp

songs:
spotify_id: String (PK)
title: String
artist: String
cover_url: String
preview_url: String
Relationships: 1:N with jams, 1:N with queue, 1:N with swipes.

queue:
id: UUID (PK)
jam_id: UUID (FK -> jams.id)
song_id: String (FK -> songs.spotify_id)
score: Int (Default: 0)
superliked: Boolean (Default: FALSE)
status: ENUM (NOT PLAYED, PLAYED)
Constraints: UNIQUE(jam_id, song_id)  <-- Crucial for deduplication
Relationships: N:1 with jams, N:1 with songs.

swipes:
id: UUID (PK)
jam_id: UUID (FK -> jams.id)
user_id: UUID (FK -> users.id)
song_id: String (FK -> songs.spotify_id)
vote: ENUM (LIKE, DISLIKE, SUPERLIKE)
Constraints: UNIQUE(jam_id, user_id, song_id) <-- A user can only vote once per song per jam
Relationships: N:1 with jams, N:1 with users, N:1 with songs.

## 5. Critical Logic
- **Queue Dynamism:** The "Next Song" is always the one with `status = NOT_PLAYED` having the highest `score` (or `superliked = true`).
- **Safety:** Only the `current_song_id` is safe from being reordered.
- **Super-Like:** Limited to 1 use per user per jam session.