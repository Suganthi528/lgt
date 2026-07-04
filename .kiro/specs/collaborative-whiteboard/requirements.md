# Requirements Document

## Introduction

The video meeting platform has a basic whiteboard with freehand drawing and clear-all. This spec upgrades it into a fully collaborative whiteboard where every participant can draw, write text, add shapes, and annotate in real time. All changes are instantly visible to everyone in the room. The whiteboard opens as a full-screen overlay, persists its state for late joiners, and supports undo/redo, image upload, and export — making it a practical tool for brainstorming, teaching, and design reviews during live meetings.

## Glossary

- **Whiteboard**: The shared canvas surface visible to all participants in a meeting room.
- **Stroke**: A single freehand drawn line segment from one point to another.
- **Tool**: A drawing mode selected by a participant (pen, eraser, text, shape, select).
- **Shape**: A geometric primitive drawn on the whiteboard (rectangle, circle, line, arrow).
- **Sticky Note**: A coloured text box placed at a fixed position on the canvas.
- **Undo Stack**: A per-participant ordered list of reversible drawing actions.
- **Participant Cursor**: A labelled pointer showing where another participant's mouse is on the canvas.
- **Stroke History**: The ordered list of all drawing actions for a room, stored on the server.
- **Export**: Saving the current whiteboard canvas as a PNG image file.
- **Room**: A video meeting session identified by a unique room ID.
- **Socket**: A persistent WebSocket connection between a client and the server.
- **Canvas**: The HTML5 `<canvas>` element that renders the whiteboard surface.
- **Tool Palette**: The UI panel containing all drawing tool controls.
- **Author**: The participant who created a specific drawing action.

---

## Requirements

### Requirement 1

**User Story:** As a meeting participant, I want to open the whiteboard as a full-screen overlay so that I have enough space to draw and collaborate without losing sight of the meeting context.

#### Acceptance Criteria

1. WHEN a participant clicks the Whiteboard button in the control bar, THE System SHALL display the whiteboard as a full-screen overlay covering the video grid.
2. WHEN the whiteboard is open, THE System SHALL display a close button that returns the participant to the video grid view.
3. WHEN the whiteboard overlay opens, THE System SHALL replay all existing strokes, shapes, text, and sticky notes from the room's stroke history so the participant sees the current board state.
4. WHEN the whiteboard is open, THE System SHALL keep the socket connection active so real-time drawing events continue to be received.
5. WHILE the whiteboard is open, THE System SHALL display a participant count badge showing how many people currently have the whiteboard open.

---

### Requirement 2

**User Story:** As a meeting participant, I want a tool palette with pen, eraser, text, shapes, and a select tool so that I can express ideas in multiple ways on the whiteboard.

#### Acceptance Criteria

1. WHEN the whiteboard is open, THE System SHALL display a tool palette containing: Pen, Eraser, Text, Rectangle, Circle, Line, Arrow, and Select tools.
2. WHEN a participant selects the Pen tool, THE System SHALL allow freehand drawing on the canvas using the chosen colour and stroke width.
3. WHEN a participant selects the Eraser tool, THE System SHALL remove drawn content under the eraser cursor without affecting other participants' views until the stroke is committed.
4. WHEN a participant selects the Text tool and clicks on the canvas, THE System SHALL place an editable text input at that position and commit the text as a drawing object when the participant presses Enter or clicks away.
5. WHEN a participant selects a Shape tool (Rectangle, Circle, Line, or Arrow), THE System SHALL render a live preview of the shape as the participant drags, then commit the final shape on mouse-up.
6. WHEN a participant selects the Select tool and clicks a drawing object, THE System SHALL highlight that object and allow the participant to move it by dragging.

---

### Requirement 3

**User Story:** As a meeting participant, I want to choose colours and stroke widths so that my drawings are visually distinct and easy to read.

#### Acceptance Criteria

1. WHEN the whiteboard is open, THE System SHALL display a colour picker with at least 12 preset colours and a custom colour input.
2. WHEN a participant selects a colour, THE System SHALL apply that colour to all subsequent pen, shape, and text actions until changed.
3. WHEN the whiteboard is open, THE System SHALL display a stroke-width selector with at least four sizes: 2 px, 5 px, 10 px, and 20 px.
4. WHEN a participant changes the stroke width, THE System SHALL apply the new width to all subsequent pen and shape actions until changed.
5. WHEN a participant uses the Eraser tool, THE System SHALL use a fixed eraser size of 30 px regardless of the selected stroke width.

---

### Requirement 4

**User Story:** As a meeting participant, I want all my drawing actions to appear instantly on every other participant's whiteboard so that collaboration feels real-time and fluid.

#### Acceptance Criteria

1. WHEN a participant draws a stroke segment, THE System SHALL emit the stroke data to the server via Socket and the server SHALL broadcast it to all other participants in the room within 100 ms under normal network conditions.
2. WHEN a participant commits a shape or text object, THE System SHALL emit the complete object to the server and the server SHALL broadcast it to all other participants.
3. WHEN a participant clears the whiteboard, THE System SHALL emit a clear event and the server SHALL broadcast it to all participants including the sender.
4. WHEN a participant moves their cursor over the canvas, THE System SHALL emit cursor position updates and THE System SHALL render a labelled cursor for that participant on all other participants' canvases.
5. IF a participant's socket disconnects and reconnects, THEN THE System SHALL re-send the full stroke history to that participant so the whiteboard state is restored.

---

### Requirement 5

**User Story:** As a meeting participant, I want undo and redo so that I can correct mistakes without clearing the entire board.

#### Acceptance Criteria

1. WHEN a participant presses Ctrl+Z or clicks the Undo button, THE System SHALL reverse the participant's most recent drawing action on their canvas and broadcast the undo to all other participants.
2. WHEN a participant presses Ctrl+Y or clicks the Redo button, THE System SHALL re-apply the most recently undone action and broadcast the redo to all other participants.
3. WHILE there are no actions to undo, THE System SHALL disable the Undo button.
4. WHILE there are no actions to redo, THE System SHALL disable the Redo button.
5. WHEN a participant performs a new drawing action after undoing, THE System SHALL clear the redo stack for that participant.

---

### Requirement 6

**User Story:** As a meeting participant, I want to add sticky notes with text so that I can leave labelled annotations at specific positions on the whiteboard.

#### Acceptance Criteria

1. WHEN a participant clicks the Sticky Note button and then clicks on the canvas, THE System SHALL place a sticky note at that position with a default colour and an editable text field.
2. WHEN a participant types in a sticky note and clicks away or presses Escape, THE System SHALL commit the sticky note as a persistent object and broadcast it to all participants.
3. WHEN a sticky note is committed, THE System SHALL display the author's name in small text at the bottom of the sticky note.
4. WHEN a participant drags a sticky note, THE System SHALL update its position in real time and broadcast the new position to all participants.
5. WHEN a participant double-clicks a sticky note they authored, THE System SHALL allow them to edit the text and re-commit on blur.

---

### Requirement 7

**User Story:** As a meeting participant, I want to upload an image to the whiteboard so that I can share diagrams, screenshots, or reference material with the group.

#### Acceptance Criteria

1. WHEN a participant clicks the Image Upload button, THE System SHALL open a file picker accepting PNG, JPG, and GIF formats up to 5 MB.
2. WHEN a valid image is selected, THE System SHALL render the image on the canvas at a default size and broadcast the image data (as a base64 data URL) to all participants.
3. IF the selected file exceeds 5 MB, THEN THE System SHALL display an error message and reject the upload without modifying the canvas.
4. IF the selected file is not a supported image format, THEN THE System SHALL display an error message and reject the upload.
5. WHEN an image is placed on the canvas, THE System SHALL allow the participant to drag it to reposition it.

---

### Requirement 8

**User Story:** As a meeting participant, I want to export the whiteboard as a PNG image so that I can save the session's content after the meeting.

#### Acceptance Criteria

1. WHEN a participant clicks the Export button, THE System SHALL generate a PNG image of the current canvas content.
2. WHEN the PNG is generated, THE System SHALL trigger a browser download with a filename in the format `whiteboard_<roomId>_<timestamp>.png`.
3. WHEN the export is triggered, THE System SHALL include all drawn content visible on the canvas at the time of export.
4. WHEN the export completes, THE System SHALL display a brief success notification to the participant.

---

### Requirement 9

**User Story:** As a meeting participant, I want to see other participants' cursors labelled with their names so that I know who is drawing where on the whiteboard.

#### Acceptance Criteria

1. WHILE the whiteboard is open, THE System SHALL display a coloured cursor icon for each other participant who has the whiteboard open, labelled with their name.
2. WHEN a participant moves their cursor on the canvas, THE System SHALL broadcast the cursor position and THE System SHALL update the cursor position on all other participants' canvases within 50 ms under normal network conditions.
3. WHEN a participant closes the whiteboard, THE System SHALL remove that participant's cursor from all other participants' canvases.
4. WHEN a participant is drawing, THE System SHALL visually distinguish their cursor (e.g. filled dot) from when they are idle (e.g. outlined dot).

---

### Requirement 10

**User Story:** As a meeting participant, I want the whiteboard state to persist for the duration of the room so that late joiners see the full drawing history.

#### Acceptance Criteria

1. WHEN a participant joins a room where whiteboard activity has occurred, THE System SHALL replay the full stroke history on that participant's canvas immediately after joining.
2. WHEN the server receives a drawing action, THE System SHALL append it to the room's stroke history in memory.
3. WHEN a clear event is received by the server, THE System SHALL reset the room's stroke history to an empty list.
4. WHEN an undo event is received by the server, THE System SHALL remove the corresponding action from the room's stroke history.
5. IF the server restarts, THEN THE System SHALL restore the stroke history from the persisted rooms file so the whiteboard state survives a cold restart.
