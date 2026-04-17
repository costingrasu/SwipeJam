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

2.Lyrics state. In this state the only difference between the first state is that instead of the song cover are the lyrics dinamically retrieved of the song. On bottom there is still the player

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
active: Boolean
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

## 6. Design System & UI Guidelines

### Typography
- **Headings & Brand (Logo/Titles):** `Poppins` (Google Fonts) - Modern, geometric, and friendly.
- **Body & UI Text (Track names, UI elements):** `Inter` (Google Fonts) - Clean, highly readable, perfect for complex interfaces.

### Color Palette (Tailwind CSS Reference)
The UI colors are directly extracted from the SwipeJam logo to maintain strong brand consistency.

#### Primary Colors
- **Deep Jam Purple:** `#732C7B` (Primary brand color, main buttons, active states, progress bars)
- **Jam Hover:** `#8A3A93` (Hover states for primary buttons)
- **Jam Dark:** `#58205E` (Pressed states, deep accents)

#### Secondary / Accent
- **Golden Crust:** `#C97A34` (Gamification elements, Super-Like actions, badges, highlights)
- **Crust Light:** `#E08B40` (Hover states for gamification elements)

#### Neutrals & Backgrounds (Light Mode)
- **Dough Cream (Main BG):** `#F9F6F0` (Main app background, warmer and easier on the eyes than pure white)
- **Pure White (Surfaces):** `#FFFFFF` (Swipe cards, modals, popups, dropdowns)
- **Silver Knife (Borders):** `#D1D5DB` (Dividers in the queue, subtle borders, inactive elements)

#### Text Colors
- **Dark Roast (Main Text):** `#2A1D2D` (Primary text, track names, usernames - avoids harsh pure black)
- **Subtle Gray (Secondary Text):** `#6B636E` (Artist names, timestamps, placeholders)

#### Dark Mode (Optional/Future)
- **Dark Background:** `#150F16` (Deep purple-tinted black for the main background)
- **Dark Surfaces:** `#251A27` (Swipe cards and modals in dark mode)
- **Primary Accent (Dark Mode):** `#A14EAB` (Lighter purple for better visibility on dark backgrounds)

## 7. Spotify Documentation Chapters:
Web API

Overview
Getting started
Building with AI
Concepts
Access Token
API calls
Apps
Authorization
Redirect URIs
Playlists
Quota modes
Rate limits
Scopes
Spotify URIs and IDs
Track Relinking
Tutorials
Authorization code
Authorization code PKCE
Client credentials
Implicit grant [Deprecated]
Refreshing tokens
Migration: Implicit grant to Authorization code
Migration: Insecure redirect URI
Migration: February 2026 Dev Mode Changes
How-Tos
Display your Spotify profile data in a web app
Changelog
March 2026
February 2026
Reference
Albums
Get Album
Get Several Albums
Get Album Tracks
Get User's Saved Albums
Save Albums for Current User
Remove Users' Saved Albums
Check User's Saved Albums
Get New Releases
Artists
Get Artist
Get Several Artists
Get Artist's Albums
Get Artist's Top Tracks
Get Artist's Related Artists
Audiobooks
Get an Audiobook
Get Several Audiobooks
Get Audiobook Chapters
Get User's Saved Audiobooks
Save Audiobooks for Current User
Remove User's Saved Audiobooks
Check User's Saved Audiobooks
Categories
Get Several Browse Categories
Get Single Browse Category
Chapters
Get a Chapter
Get Several Chapters
Episodes
Get Episode
Get Several Episodes
Get User's Saved Episodes
Save Episodes for Current User
Remove User's Saved Episodes
Check User's Saved Episodes
Genres
Get Available Genre Seeds
Library
Save Items to Library
Remove Items from Library
Check User's Saved Items
Markets
Get Available Markets
Player
Get Playback State
Transfer Playback
Get Available Devices
Get Currently Playing Track
Start/Resume Playback
Pause Playback
Skip To Next
Skip To Previous
Seek To Position
Set Repeat Mode
Set Playback Volume
Toggle Playback Shuffle
Get Recently Played Tracks
Get the User's Queue
Add Item to Playback Queue
Playlists
Get Playlist
Change Playlist Details
Get Playlist Items [DEPRECATED]
Update Playlist Items [DEPRECATED]
Add Items to Playlist [DEPRECATED]
Remove Playlist Items [DEPRECATED]
Get Playlist Items
Update Playlist Items
Add Items to Playlist
Remove Playlist Items
Get Current User's Playlists
Create Playlist
Get User's Playlists
Create Playlist for user
Get Featured Playlists
Get Category's Playlists
Get Playlist Cover Image
Add Custom Playlist Cover Image
Search
Search for Item
Shows
Get Show
Get Several Shows
Get Show Episodes
Get User's Saved Shows
Save Shows for Current User
Remove User's Saved Shows
Check User's Saved Shows
Tracks
Get Track
Get Several Tracks
Get User's Saved Tracks
Save Tracks for Current User
Remove User's Saved Tracks
Check User's Saved Tracks
Get Several Tracks' Audio Features
Get Track's Audio Features
Get Track's Audio Analysis
Get Recommendations
Users
Get Current User's Profile
Get User's Top Items
Get User's Profile
Follow Playlist
Unfollow Playlist
Get Followed Artists
Follow Artists or Users
Unfollow Artists or Users
Check If User Follows Artists or Users
Check if Current User Follows Playlist