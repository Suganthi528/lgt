# Design Document — Collaborative Whiteboard

## Overview

The existing whiteboard is a minimal canvas inside a small modal with freehand drawing, a colour picker, brush size, and clear-all. This design upgrades it into a full collaborative whiteboard that opens full-screen, supports multiple drawing tools (pen, eraser, text, shapes, sticky notes, image upload), syncs all actions in real time via Socket.IO, shows live participant cursors, and supports per-participant undo/redo and PNG export.

The upgrade is entirely additive — the existing socket events (`whiteboard-draw`, `whiteboard-clear`) are extended, not replaced. New events are added for shapes, text, sticky notes, images, undo, redo, and cursor movement.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Client (React)                                             │
│                                                             │
│  VideoCall.js                                               │
│  ├── Whiteboard state (tool, colour, size, undo stack…)     │
│  ├── Whiteboard.js  ← new extracted component               │
│  │   ├── ToolPalette.js                                     │
│  │   ├── <canvas> (drawing surface)                         │
│  │   ├── StickyNote overlays (positioned <div>s)            │
│  │   └── ParticipantCursors overlay                         │
│  └── Socket event handlers (whiteboard-*)                   │
│                                                             │
│  Socket.IO client ──────────────────────────────────────┐  │
└────────────────────────────────────────────────────────────┘
                                                          │
                                              WebSocket   │
┌─────────────────────────────────────────────────────────┘
│  Server (Node.js / index.js)
│
│  room.whiteboardStrokes[]   ← append-only action log
│  Socket handlers:
│    whiteboard-draw          (existing, extended)
│    whiteboard-object        (new: shapes, text, images)
│    whiteboard-sticky        (new: sticky note add/move/edit)
│    whiteboard-undo          (new)
│    whiteboard-redo          (new)
│    whiteboard-clear         (existing)
│    whiteboard-cursor        (new: cursor position)
│    whiteboard-open          (new: participant opened board)
│    whiteboard-close         (new: participant closed board)
└─────────────────────────────────────────────────────────
```

---

## Components and Interfaces

### `Whiteboard.js` (new component, extracted from VideoCall.js)

Renders the full-screen whiteboard overlay. Owns the canvas ref, tool state, undo/redo stacks, and cursor overlay.

**Props:**
```js
{
  roomId: string,
  participantName: string,
  socketRef: React.MutableRefObject,
  initialStrokes: DrawAction[],   // from room.whiteboardStrokes on join
  onClose: () => void
}
```

**Internal state:**
```js
tool: 'pen' | 'eraser' | 'text' | 'rect' | 'circle' |