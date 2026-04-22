# Requirements Document

## Introduction

This feature enhances the VideoMeet Pro application so that when a host creates a meeting room, all meeting details are automatically saved and surfaced in an "Upcoming Events" section visible to all users. Participants can browse the list of upcoming meetings and join any meeting directly from that section without needing to know the Room ID in advance.

Currently, rooms are stored only in server memory and optionally in the creator's localStorage, meaning other devices and participants cannot discover meetings. This feature makes room discovery universal and reliable.

## Glossary

- **Host**: The user who creates a meeting room and holds admin privileges
- **Participant**: Any user who joins a meeting room, including the host
- **Room**: A video conferencing session identified by a unique Room ID and protected by a passcode
- **Join Link**: A shareable URL that pre-fills the Room ID on the Join Room page
- **Upcoming Events**: The section on the Home page listing all active/scheduled rooms
- **Room Details**: The set of metadata for a room — Room ID, host name, meeting date, start time, end time, join link, and participant count
- **Server**: The Node.js/Express backend deployed on Render
- **Client**: The React frontend deployed via ngrok or Render

## Requirements

---

### Requirement 1

**User Story:** As a host, I want all meeting details to be automatically saved when I create a room, so that participants can discover and join the meeting without me manually sharing the Room ID.

#### Acceptance Criteria

1. WHEN a host submits the Create Room form with valid inputs, THE system SHALL persist the room details (Room ID, host name, meeting date, start time, end time, passcode hash) to the server.
2. WHEN a room is successfully created, THE system SHALL generate a shareable join link in the format `{baseUrl}/join-room?roomId={roomId}`.
3. WHEN a room is successfully created, THE system SHALL display a confirmation screen showing the Room ID, join link, meeting date, and start time before navigating into the room.
4. IF the server is unreachable during room creation, THEN THE system SHALL retry the request up to 3 times with a 5-second interval and display a "Server is waking up..." status message during each retry.
5. IF all retry attempts fail, THEN THE system SHALL display a descriptive error message and keep the form data intact so the host can try again.

---

### Requirement 2

**User Story:** As a participant, I want to see a list of all upcoming meetings on the Home page, so that I can discover and join meetings without needing the Room ID shared separately.

#### Acceptance Criteria

1. WHEN a participant visits the Home page, THE system SHALL fetch and display all active rooms from the server in the Upcoming Events section.
2. WHEN the server returns room data, THE system SHALL display each room's Room ID, host name, meeting date, start time, end time (if set), participant count, and join link.
3. WHEN the Upcoming Events list is loading, THE system SHALL display skeleton placeholder cards to indicate loading state.
4. WHEN no rooms exist on the server, THE system SHALL display an empty-state message prompting the user to create a room.
5. IF the server is unreachable, THEN THE system SHALL fall back to displaying rooms saved in the browser's localStorage and show a "Showing locally saved meetings" notice.

---

### Requirement 3

**User Story:** As a participant, I want to join a meeting directly from the Upcoming Events section, so that I can enter a room with a single click without manually entering the Room ID.

#### Acceptance Criteria

1. WHEN a participant clicks the Join button on an event card, THE system SHALL navigate to the Join Room page with the Room ID pre-filled.
2. WHEN a participant clicks a join link URL, THE system SHALL parse the `roomId` query parameter and pre-fill it on the Join Room page.
3. WHEN a participant submits the Join Room form with a pre-filled Room ID, THE system SHALL verify the passcode against the server before granting access.
4. WHILE a room's scheduled end time has passed, THE system SHALL remove that room from the Upcoming Events list.

---

### Requirement 4

**User Story:** As a host, I want to copy and share the join link after creating a room, so that I can invite participants via any communication channel.

#### Acceptance Criteria

1. WHEN a room is successfully created, THE system SHALL display a copyable join link field on the confirmation screen.
2. WHEN a host clicks the "Copy Link" button, THE system SHALL copy the join link to the clipboard and display a "Copied!" confirmation for 2 seconds.
3. WHEN a host clicks the "Copy Link" button, THE system SHALL NOT navigate away from the confirmation screen.

---

### Requirement 5

**User Story:** As a participant, I want the Upcoming Events list to stay current, so that I always see the latest room state including participant counts.

#### Acceptance Criteria

1. WHEN the Home page is visible, THE system SHALL refresh the Upcoming Events list every 30 seconds automatically.
2. WHEN a new participant joins a room, THE system SHALL update the participant count for that room in the server's room data.
3. WHEN a room is ended by the host, THE system SHALL remove that room from the server's room list so it no longer appears in Upcoming Events.
4. WHEN a host refreshes the Home page, THE system SHALL show the latest room data fetched from the server.
