# Design Document: Room Auto-Details & Upcoming Meetings Join Flow

## Overview

This feature removes manual Room ID and passcode entry from the Create Room form, auto-generates both values on submission, and ensures the created room immediately surfaces in the Upcoming Meetings list. It also upgrades the "Join Meeting" button on each event card so participants are taken directly into the join flow with credentials pre-filled — they only need to supply their name and email.

The changes touch three layers:
- **Client – CreateRoom**: strip the manual fields, generate credentials client-side, show a confirmation modal before navigating.
- **Client – Home (Upcoming Meetings)**: pass the passcode through the navigation state when a participant clicks "Join Meeting."
- **Client – JoinRoom**: detect pre-filled credentials from navigation state and hide the passcode field accordingly.
- **Server**: no structural changes needed; the existing `POST /api/rooms` and `GET /api/rooms` endpoints already support the required data shape.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│  CreateRoom ──(auto-gen roomId + passcode)──► POST /api/rooms
│                                                         │
│  Home ──(GET /api/rooms)──► Upcoming Meetings list      │
│         │                                               │
│         └──(click Join, pass {roomId, passcode})──►     │
│                                                         │
│  JoinRoom ──(pre-filled, passcode hidden)──► POST /api/rooms/:id/verify
│                                                         │
└─────────────────────────────────────────────────────────┘
                          │
                    Node.js Server
                  (rooms Map in memory)
```

The server is stateless between restarts; room state lives in the in-memory `rooms` Map. The client supplements this with `localStorage` for resilience when the server is unreachable.

---

## Components and Interfaces

### CreateRoom (modified)

**Removed fields:** `roomId`, `passcode` (no longer rendered or user-editable).

**New behaviour:**
1. On form submit, generate `roomId` (8-char uppercase alphanumeric) and `passcode` (12-char mixed alphanumeric) client-side.
2. POST to `/api/rooms`. If the server returns `400` (duplicate ID), regenerate and retry up to 5 times.
3. On success, show a `RoomCreatedModal` with the Room ID and passcode, then navigate to the room.

**Generator functions (pure, testable):**
```js
generateRoomId()   // → 8-char uppercase alphanumeric string
generatePasscode() // → 12-char mixed alphanumeric string
```

### RoomCreatedModal (new component)

A simple overlay that displays:
- Generated Room ID (copyable)
- Generated Passcode (copyable)
- "Enter Room" button to proceed

Props: `{ roomId, passcode, onConfirm }`

### Home – Upcoming Meetings (modified)

Each event card's "Join Meeting" button navigates to `/join-room` with:
```js
{ state: { roomId: event.id, passcode: event.passcode } }
```

The server's `GET /api/rooms` response currently omits the passcode for security. To support passcode-free joining from the list, the server will include the passcode in the room list response (rooms are already passcode-protected at the join/verify step; listing passcodes is acceptable since the verify endpoint is the actual gate).

Alternatively — and more securely — the passcode is stored in `localStorage` alongside the room when the creator creates it, and is read back when building the event card. This avoids exposing passcodes over the wire to all clients.

**Chosen approach:** Store `passcode` in the `createdRooms` localStorage entry. When rendering event cards, merge the localStorage passcode into the server-fetched room list by matching on `id`. Only the creator's device will have the passcode; other devices will still need to enter it manually (the "Join Meeting" button will navigate without a pre-filled passcode for those users).

### JoinRoom (modified)

Reads `location.state.passcode` in addition to `location.state.roomId`.

- If `passcode` is present in state: hide the passcode input field and use the embedded value.
- If `passcode` is absent: show the passcode field as before.

---

## Data Models

### Room (server in-memory)

No changes to the existing shape:
```js
{
  id: string,           // 8-char uppercase alphanumeric
  passcode: string,     // 12-char mixed alphanumeric
  creatorName: string,
  creatorEmail: string,
  meetingDate: string,  // "YYYY-MM-DD"
  meetingTime: string,  // "HH:MM"
  meetingEndTime: string | null,
  adminId: string | null,
  participants: Participant[],
  chatMessages: ChatMessage[],
  reactions: Reaction[],
  raisedHands: RaisedHand[],
  createdAt: string     // ISO 8601
}
```

### CreatedRoom (localStorage entry)

```js
{
  id: string,
  passcode: string,       // ← NEW: stored so creator can share/join without re-entering
  creatorName: string,
  meetingDate: string,
  meetingTime: string,
  meetingEndTime: string | null,
  participantCount: number,
  createdAt: string
}
```

### RoomListItem (GET /api/rooms response item)

No server-side changes. The passcode is intentionally omitted from the list endpoint.

```js
{
  id: string,
  creatorName: string,
  meetingDate: string,
  meetingTime: string,
  meetingEndTime: string | null,
  participantCount: number,
  createdAt: string
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property-based testing library:** `fast-check` (JavaScript). Each property test runs a minimum of 100 iterations.

Each property-based test MUST be tagged with:
`// Feature: room-auto-details, Property {N}: {property_text}`

---

Property 1: Generated Room IDs are unique across repeated calls
*For any* sequence of N calls to `generateRoomId()`, all N values should be distinct strings of exactly 8 uppercase alphanumeric characters.
**Validates: Requirements 1.1**

---

Property 2: Generated passcodes meet length and character constraints
*For any* call to `generatePasscode()`, the returned string should have a length of at least 8 characters and contain only alphanumeric characters.
**Validates: Requirements 1.2**

---

Property 3: Room creation persists to localStorage
*For any* valid room object, after the creation success handler runs, querying `localStorage.getItem('createdRooms')` and parsing the result should contain an entry whose `id` and `passcode` match the created room.
**Validates: Requirements 2.3**

---

Property 4: Upcoming Meetings list reflects server rooms
*For any* array of room objects returned by the server, the rendered Upcoming Meetings list should contain one card per room, each displaying the correct Room ID, host name, date, and start time.
**Validates: Requirements 4.1**

---

Property 5: Join navigation embeds correct credentials
*For any* event card rendered with a known `roomId` and `passcode`, clicking "Join Meeting" should produce a navigation state where `state.roomId` equals the card's Room ID and `state.passcode` equals the card's passcode.
**Validates: Requirements 3.1, 3.2**

---

Property 6: JoinRoom hides passcode field when pre-filled
*For any* navigation state that includes a non-empty `passcode`, the JoinRoom form should not render a visible passcode input field.
**Validates: Requirements 3.3**

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Duplicate Room ID on creation | Client regenerates and retries up to 5 times; if all fail, shows an error message |
| Server unreachable on room creation | Shows network error; does not navigate away |
| Server unreachable on home page load | Falls back to `localStorage` rooms |
| Room not found at join time | Displays "Room not found" error; stays on JoinRoom form |
| Invalid passcode at join time | Displays "Invalid passcode" error; stays on JoinRoom form |

---

## Testing Strategy

### Unit Tests (via React Testing Library + Jest, already configured)

- `generateRoomId` returns an 8-char uppercase alphanumeric string.
- `generatePasscode` returns a string of ≥ 8 alphanumeric characters.
- `CreateRoom` form does not render Room ID or passcode inputs.
- `RoomCreatedModal` renders the Room ID and passcode and calls `onConfirm` when the button is clicked.
- `JoinRoom` hides the passcode field when `location.state.passcode` is set.
- `JoinRoom` shows the passcode field when `location.state.passcode` is absent.

### Property-Based Tests (via `fast-check`)

`fast-check` is installed as a dev dependency in the client package. Each property test runs 100+ iterations.

- **Property 1** – `generateRoomId` uniqueness and format across arbitrary call counts.
- **Property 2** – `generatePasscode` length and character-set constraints across arbitrary calls.
- **Property 3** – localStorage round-trip: any valid room object survives the save/load cycle intact.
- **Property 4** – Upcoming Meetings rendering: any array of room objects produces the correct number of cards with correct content.
- **Property 5** – Join navigation state: any event card produces the correct navigation state on click.
- **Property 6** – JoinRoom passcode field visibility: any non-empty passcode in state hides the field.
