# Requirements Document

## Introduction

This feature enhances the room creation flow in VideoMeet Pro so that room details (Room ID and passcode) are generated automatically when a user creates a room — no manual entry required. After creation, the new room immediately appears in the "Upcoming Meetings" section on the home page. Participants can then browse upcoming meetings and join directly from that list, with the Room ID pre-filled and the passcode embedded so they only need to enter their name and email.

## Glossary

- **Room**: A virtual video conferencing session identified by a unique Room ID and protected by a passcode.
- **Room ID**: A unique alphanumeric identifier automatically generated for each room.
- **Passcode**: A randomly generated secret string used to authenticate participants joining a room.
- **Creator**: The user who initiates and hosts a room.
- **Participant**: Any user who joins an existing room.
- **Upcoming Meetings**: The section on the home page that lists all rooms available to join.
- **Room Details**: The combination of Room ID, passcode, meeting date, start time, and optional end time associated with a room.
- **System**: The VideoMeet Pro application, comprising the React client and the Node.js/Express server.
- **Local Storage**: The browser's built-in key-value store used to persist room data on the creator's device.
- **Server**: The Node.js/Express backend that stores room state in memory and exposes REST and WebSocket APIs.

---

## Requirements

### Requirement 1

**User Story:** As a creator, I want room details to be generated automatically when I create a room, so that I don't have to manually invent a Room ID or passcode.

#### Acceptance Criteria

1. WHEN a user submits the Create Room form, THE System SHALL generate a unique Room ID composed of 8 uppercase alphanumeric characters without requiring the user to provide one.
2. WHEN a user submits the Create Room form, THE System SHALL generate a random passcode of at least 8 characters without requiring the user to provide one.
3. WHEN the Create Room form is rendered, THE System SHALL hide the Room ID and passcode input fields from the user.
4. WHEN a room is successfully created, THE System SHALL display the generated Room ID and passcode to the creator before navigating away.
5. IF the generated Room ID already exists on the Server, THEN THE System SHALL generate a new unique Room ID and retry the creation request.

---

### Requirement 2

**User Story:** As a creator, I want my newly created room to appear immediately in the Upcoming Meetings list, so that participants on any device can discover and join it.

#### Acceptance Criteria

1. WHEN a room is successfully created, THE System SHALL persist the room record to the Server so that it is retrievable by all clients.
2. WHEN the home page loads, THE System SHALL fetch the current list of rooms from the Server and display them in the Upcoming Meetings section.
3. WHEN a room is successfully created, THE System SHALL add the room to the creator's Local Storage so that it appears in Upcoming Meetings even if the Server fetch fails.
4. WHILE the Upcoming Meetings list is loading, THE System SHALL display a loading indicator to the user.
5. IF the Server is unreachable when fetching rooms, THEN THE System SHALL fall back to displaying rooms stored in Local Storage.

---

### Requirement 3

**User Story:** As a participant, I want to join a meeting directly from the Upcoming Meetings list, so that I don't have to manually enter the Room ID or passcode.

#### Acceptance Criteria

1. WHEN a participant clicks "Join Meeting" on an upcoming event card, THE System SHALL navigate to the Join Room form with the Room ID pre-filled.
2. WHEN a participant clicks "Join Meeting" on an upcoming event card, THE System SHALL embed the room passcode so the participant is not required to enter it manually.
3. WHEN the Join Room form is pre-filled from an upcoming event, THE System SHALL require only the participant's name and email before allowing them to join.
4. WHEN a participant submits the pre-filled Join Room form, THE System SHALL verify the embedded Room ID and passcode against the Server before granting access.
5. IF the room no longer exists on the Server at join time, THEN THE System SHALL display a clear error message to the participant and remain on the Join Room form.

---

### Requirement 4

**User Story:** As a participant, I want each upcoming meeting card to show relevant details, so that I can identify the correct meeting before joining.

#### Acceptance Criteria

1. WHEN the Upcoming Meetings list is rendered, THE System SHALL display the Room ID, host name, meeting date, and start time on each event card.
2. WHERE an end time is provided, THE System SHALL display the end time on the event card alongside the start time.
3. WHEN the Upcoming Meetings list is rendered, THE System SHALL display the current participant count for each room.
4. WHEN a room has no scheduled meetings, THE System SHALL display a "No upcoming meetings" message with a prompt to create a new room.
