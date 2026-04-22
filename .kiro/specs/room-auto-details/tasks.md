# Implementation Plan

- [ ] 1. Add credential generator utilities
  - Create `src/utils/roomCredentials.js` exporting `generateRoomId()` (8-char uppercase alphanumeric) and `generatePasscode()` (12-char alphanumeric)
  - Both functions must be pure with no side effects
  - _Requirements: 1.1, 1.2_

- [ ]* 1.1 Write property tests for credential generators
  - Install `fast-check` as a dev dependency in the client package
  - **Property 1: Generated Room IDs are unique across repeated calls** — for any N calls, all values are distinct 8-char uppercase alphanumeric strings
  - **Property 2: Generated passcodes meet length and character constraints** — for any call, result has length ≥ 8 and contains only alphanumeric characters
  - Tag each test: `// Feature: room-auto-details, Property 1: ...` and `// Feature: room-auto-details, Property 2: ...`
  - **Validates: Requirements 1.1, 1.2**

- [ ] 2. Update CreateRoom component
  - Remove `roomId` and `passcode` fields from form state, JSX, and validation
  - On submit, call `generateRoomId()` and `generatePasscode()` to produce credentials
  - Retry up to 5 times with a new `generateRoomId()` if the server returns HTTP 400 (duplicate ID)
  - On success, store `passcode` in the `createdRooms` localStorage entry alongside existing fields
  - After successful creation, show `RoomCreatedModal` before navigating to the room
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.3_

- [ ]* 2.1 Write property test for localStorage round-trip
  - **Property 3: Room creation persists to localStorage** — for any valid room object, after the creation success handler runs, `localStorage.getItem('createdRooms')` parsed result contains an entry with matching `id` and `passcode`
  - Tag: `// Feature: room-auto-details, Property 3: ...`
  - **Validates: Requirements 2.3**

- [ ] 3. Create RoomCreatedModal component
  - Create `src/components/RoomCreatedModal.js` and `RoomCreatedModal.css`
  - Props: `{ roomId, passcode, onConfirm }`
  - Display Room ID and passcode with copy-to-clipboard buttons
  - Render an "Enter Room" button that calls `onConfirm`
  - _Requirements: 1.4_

- [ ] 4. Update Home component — pass passcode through Join navigation state
  - When merging server rooms with localStorage rooms, attach `passcode` from the matching localStorage entry to each merged room object
  - Update the "Join Meeting" `Link` to pass `state: { roomId: event.id, passcode: event.passcode }` (passcode may be undefined for rooms not created on this device)
  - _Requirements: 3.1, 3.2_

- [ ]* 4.1 Write property test for join navigation state
  - **Property 5: Join navigation embeds correct credentials** — for any event card rendered with a known `roomId` and `passcode`, clicking "Join Meeting" produces navigation state where `state.roomId` and `state.passcode` match the card's values
  - Tag: `// Feature: room-auto-details, Property 5: ...`
  - **Validates: Requirements 3.1, 3.2**

- [ ]* 4.2 Write property test for Upcoming Meetings card content
  - **Property 4: Upcoming Meetings list reflects server rooms** — for any array of room objects, the rendered list contains one card per room displaying the correct Room ID, host name, date, start time, and participant count
  - Tag: `// Feature: room-auto-details, Property 4: ...`
  - **Validates: Requirements 4.1, 4.3**

- [ ] 5. Update JoinRoom component — handle pre-filled credentials
  - Read `location.state.passcode` on mount; if present, store it in component state and hide the passcode `<input>` field
  - Use the embedded passcode value when calling the verify endpoint
  - _Requirements: 3.2, 3.3, 3.4_

- [ ]* 5.1 Write property test for passcode field visibility
  - **Property 6: JoinRoom hides passcode field when pre-filled** — for any navigation state containing a non-empty `passcode`, the JoinRoom form does not render a visible passcode input
  - Tag: `// Feature: room-auto-details, Property 6: ...`
  - **Validates: Requirements 3.3_

- [ ] 6. Checkpoint — Ensure all tests pass, ask the user if questions arise.
