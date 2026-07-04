import React, { useEffect, useRef, useState, useCallback } from 'react';
import './Whiteboard.css';

const TOOLS = {
  PEN: 'pen',
  ERASER: 'eraser',
  LINE: 'line',
  RECT: 'rect',
  ELLIPSE: 'ellipse',
  ARROW: 'arrow',
  TEXT: 'text',
  SELECT: 'select',
};

const COLORS = ['#000000','#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db','#9b59b6','#ffffff'];

export default function Whiteboard({ socket, roomInfo, participantName, onClose }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null); // for shape preview
  const containerRef = useRef(null);

  const [tool, setTool] = useState(TOOLS.PEN);
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursors, setCursors] = useState({}); // { socketId: { x, y, name } }
  const [textInput, setTextInput] = useState(null); // { x, y } when placing text
  const [textValue, setTextValue] = useState('');
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const drawingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const lastPosRef = useRef({ x: 0, y: 0 });
  const snapshotRef = useRef(null); // canvas snapshot before shape draw

  // ── Canvas helpers ──────────────────────────────────────────────────────
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    };
  };

  const getCtx = () => canvasRef.current?.getContext('2d');
  const getOverlayCtx = () => overlayRef.current?.getContext('2d');

  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    snapshotRef.current = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  }, []);

  const restoreSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshotRef.current) return;
    canvas.getContext('2d').putImageData(snapshotRef.current, 0, 0);
  }, []);

  const pushUndo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL();
    setUndoStack(prev => [...prev.slice(-29), data]);
    setRedoStack([]);
  }, []);

  // ── Draw primitives ─────────────────────────────────────────────────────
  const applyStroke = useCallback((ctx, data) => {
    ctx.save();
    ctx.strokeStyle = data.tool === TOOLS.ERASER ? '#ffffff' : data.color;
    ctx.fillStyle = data.color;
    ctx.lineWidth = data.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (data.tool) {
      case TOOLS.PEN:
      case TOOLS.ERASER:
        ctx.beginPath();
        ctx.moveTo(data.x0, data.y0);
        ctx.lineTo(data.x1, data.y1);
        ctx.stroke();
        break;
      case TOOLS.LINE:
        ctx.beginPath();
        ctx.moveTo(data.x0, data.y0);
        ctx.lineTo(data.x1, data.y1);
        ctx.stroke();
        break;
      case TOOLS.RECT:
        ctx.strokeRect(data.x0, data.y0, data.x1 - data.x0, data.y1 - data.y0);
        break;
      case TOOLS.ELLIPSE: {
        const rx = Math.abs(data.x1 - data.x0) / 2;
        const ry = Math.abs(data.y1 - data.y0) / 2;
        const cx = (data.x0 + data.x1) / 2;
        const cy = (data.y0 + data.y1) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case TOOLS.ARROW: {
        const dx = data.x1 - data.x0;
        const dy = data.y1 - data.y0;
        const angle = Math.atan2(dy, dx);
        const headLen = Math.max(12, data.size * 3);
        ctx.beginPath();
        ctx.moveTo(data.x0, data.y0);
        ctx.lineTo(data.x1, data.y1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(data.x1, data.y1);
        ctx.lineTo(data.x1 - headLen * Math.cos(angle - Math.PI / 6), data.y1 - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(data.x1 - headLen * Math.cos(angle + Math.PI / 6), data.y1 - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        break;
      }
      case TOOLS.TEXT:
        ctx.font = `${data.size * 4 + 8}px sans-serif`;
        ctx.fillText(data.text, data.x0, data.y0);
        break;
      default:
        break;
    }
    ctx.restore();
  }, []);

  // Preview shape on overlay canvas while dragging
  const previewShape = useCallback((x0, y0, x1, y1) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = getOverlayCtx();
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    applyStroke(ctx, { tool, color, size, x0, y0, x1, y1 });
  }, [tool, color, size, applyStroke]);

  // ── Replay all strokes (for late joiners) ───────────────────────────────
  const replayStrokes = useCallback((strokes) => {
    const canvas = canvasRef.current;
    if (!canvas || !strokes?.length) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach(s => applyStroke(ctx, s));
  }, [applyStroke]);

  // ── Socket listeners ────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onDraw = (data) => {
      const ctx = getCtx();
      if (ctx) applyStroke(ctx, data);
    };

    const onClear = () => {
      const canvas = canvasRef.current;
      if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    };

    const onCursor = ({ socketId, name, x, y }) => {
      setCursors(prev => ({ ...prev, [socketId]: { name, x, y } }));
    };

    const onCursorLeave = ({ socketId }) => {
      setCursors(prev => { const n = { ...prev }; delete n[socketId]; return n; });
    };

    socket.on('whiteboard-draw', onDraw);
    socket.on('whiteboard-clear', onClear);
    socket.on('whiteboard-cursor', onCursor);
    socket.on('whiteboard-cursor-leave', onCursorLeave);

    // Replay existing strokes
    if (roomInfo?.whiteboardStrokes?.length) {
      setTimeout(() => replayStrokes(roomInfo.whiteboardStrokes), 50);
    }

    return () => {
      socket.off('whiteboard-draw', onDraw);
      socket.off('whiteboard-clear', onClear);
      socket.off('whiteboard-cursor', onCursor);
      socket.off('whiteboard-cursor-leave', onCursorLeave);
      socket.emit('whiteboard-cursor-leave');
    };
  }, [socket, roomInfo, applyStroke, replayStrokes]);

  // ── Pointer events ──────────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    if (tool === TOOLS.TEXT) return; // handled by click
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPos(e, canvas);
    drawingRef.current = true;
    startPosRef.current = pos;
    lastPosRef.current = pos;
    setIsDrawing(true);

    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
      pushUndo();
    } else {
      saveSnapshot();
    }
  }, [tool, pushUndo, saveSnapshot]);

  const onPointerMove = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPos(e, canvas);

    // Broadcast cursor position
    if (socket?.connected) {
      socket.emit('whiteboard-cursor', { name: participantName, x: pos.x, y: pos.y });
    }

    if (!drawingRef.current) return;

    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
      const { x: x0, y: y0 } = lastPosRef.current;
      const data = { tool, color, size, x0, y0, x1: pos.x, y1: pos.y };
      applyStroke(getCtx(), data);
      if (socket?.connected) socket.emit('whiteboard-draw', data);
      lastPosRef.current = pos;
    } else {
      // Shape tools — preview on overlay
      previewShape(startPosRef.current.x, startPosRef.current.y, pos.x, pos.y);
    }
  }, [tool, color, size, socket, participantName, applyStroke, previewShape]);

  const onPointerUp = useCallback((e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    drawingRef.current = false;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas) return;

    const pos = getPos(e, canvas);

    if (tool !== TOOLS.PEN && tool !== TOOLS.ERASER) {
      // Commit shape to main canvas
      restoreSnapshot();
      const data = {
        tool, color, size,
        x0: startPosRef.current.x, y0: startPosRef.current.y,
        x1: pos.x, y1: pos.y
      };
      pushUndo();
      applyStroke(getCtx(), data);
      if (socket?.connected) socket.emit('whiteboard-draw', data);
      // Clear overlay
      if (overlay) overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);
    }
  }, [tool, color, size, socket, applyStroke, restoreSnapshot, pushUndo]);

  // Text tool click
  const onCanvasClick = useCallback((e) => {
    if (tool !== TOOLS.TEXT) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPos(e, canvas);
    setTextInput(pos);
    setTextValue('');
  }, [tool]);

  const commitText = useCallback(() => {
    if (!textInput || !textValue.trim()) { setTextInput(null); return; }
    const data = { tool: TOOLS.TEXT, color, size, x0: textInput.x, y0: textInput.y, text: textValue };
    pushUndo();
    applyStroke(getCtx(), data);
    if (socket?.connected) socket.emit('whiteboard-draw', data);
    setTextInput(null);
    setTextValue('');
  }, [textInput, textValue, color, size, socket, applyStroke, pushUndo]);

  // ── Undo / Redo ─────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    if (!undoStack.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const current = canvas.toDataURL();
    setRedoStack(prev => [...prev, current]);
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    const img = new Image();
    img.onload = () => canvas.getContext('2d').drawImage(img, 0, 0);
    img.src = prev;
  }, [undoStack]);

  const redo = useCallback(() => {
    if (!redoStack.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const current = canvas.toDataURL();
    setUndoStack(prev => [...prev, current]);
    const next = redoStack[redoStack.length - 1];
    setRedoStack(s => s.slice(0, -1));
    const img = new Image();
    img.onload = () => canvas.getContext('2d').drawImage(img, 0, 0);
    img.src = next;
  }, [redoStack]);

  // ── Clear ───────────────────────────────────────────────────────────────
  const clearBoard = useCallback(() => {
    if (!window.confirm('Clear the whiteboard for everyone?')) return;
    pushUndo();
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    if (socket?.connected) socket.emit('whiteboard-clear');
  }, [socket, pushUndo]);

  // ── Download ────────────────────────────────────────────────────────────
  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `whiteboard-${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, onClose]);

  const toolList = [
    { id: TOOLS.PEN,     icon: '✏️', label: 'Pen' },
    { id: TOOLS.ERASER,  icon: '🧹', label: 'Eraser' },
    { id: TOOLS.LINE,    icon: '╱',  label: 'Line' },
    { id: TOOLS.RECT,    icon: '▭',  label: 'Rect' },
    { id: TOOLS.ELLIPSE, icon: '⬭',  label: 'Ellipse' },
    { id: TOOLS.ARROW,   icon: '→',  label: 'Arrow' },
    { id: TOOLS.TEXT,    icon: 'T',  label: 'Text' },
  ];

  const sizeOptions = [
    { label: 'XS', value: 2 },
    { label: 'S',  value: 4 },
    { label: 'M',  value: 8 },
    { label: 'L',  value: 14 },
    { label: 'XL', value: 22 },
  ];

  return (
    <div className="wb-overlay" onClick={onClose}>
      <div className="wb-container" ref={containerRef} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="wb-header">
          <span className="wb-title">🖊 Collaborative Whiteboard</span>
          <div className="wb-header-actions">
            <button className="wb-action-btn" onClick={undo} disabled={!undoStack.length} title="Undo (Ctrl+Z)">↩</button>
            <button className="wb-action-btn" onClick={redo} disabled={!redoStack.length} title="Redo (Ctrl+Y)">↪</button>
            <button className="wb-action-btn" onClick={download} title="Download PNG">⬇</button>
            <button className="wb-action-btn wb-clear-btn" onClick={clearBoard} title="Clear all">🗑</button>
            <button className="wb-close-btn" onClick={onClose} title="Close (Esc)">✕</button>
          </div>
        </div>

        <div className="wb-body">
          {/* ── Toolbar ── */}
          <div className="wb-toolbar">
            <div className="wb-tool-group">
              {toolList.map(t => (
                <button
                  key={t.id}
                  className={`wb-tool-btn ${tool === t.id ? 'active' : ''}`}
                  onClick={() => setTool(t.id)}
                  title={t.label}
                >
                  <span className="wb-tool-icon">{t.icon}</span>
                  <span className="wb-tool-label">{t.label}</span>
                </button>
              ))}
            </div>

            <div className="wb-divider" />

            <div className="wb-tool-group">
              <span className="wb-section-label">Color</span>
              <div className="wb-colors">
                {COLORS.map(c => (
                  <button
                    key={c}
                    className={`wb-color-swatch ${color === c ? 'active' : ''}`}
                    style={{ background: c, border: c === '#ffffff' ? '1px solid #ccc' : 'none' }}
                    onClick={() => setColor(c)}
                    title={c}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="wb-color-custom"
                  title="Custom color"
                />
              </div>
            </div>

            <div className="wb-divider" />

            <div className="wb-tool-group">
              <span className="wb-section-label">Size</span>
              <div className="wb-sizes">
                {sizeOptions.map(s => (
                  <button
                    key={s.value}
                    className={`wb-size-btn ${size === s.value ? 'active' : ''}`}
                    onClick={() => setSize(s.value)}
                    title={`${s.label} (${s.value}px)`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="wb-divider" />

            {/* Active participants */}
            <div className="wb-tool-group">
              <span className="wb-section-label">Drawing</span>
              <div className="wb-you-badge">
                <span className="wb-cursor-dot" style={{ background: '#3498db' }} />
                <span>You</span>
              </div>
              {Object.entries(cursors).map(([id, c]) => (
                <div key={id} className="wb-you-badge">
                  <span className="wb-cursor-dot" style={{ background: '#e74c3c' }} />
                  <span>{c.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Canvas area ── */}
          <div className="wb-canvas-wrap">
            <canvas
              ref={canvasRef}
              width={1200}
              height={700}
              className="wb-canvas"
              style={{ cursor: tool === TOOLS.TEXT ? 'text' : tool === TOOLS.ERASER ? 'cell' : 'crosshair' }}
              onMouseDown={onPointerDown}
              onMouseMove={onPointerMove}
              onMouseUp={onPointerUp}
              onMouseLeave={e => {
                onPointerUp(e);
                socket?.emit('whiteboard-cursor-leave');
              }}
              onTouchStart={onPointerDown}
              onTouchMove={onPointerMove}
              onTouchEnd={onPointerUp}
              onClick={onCanvasClick}
            />
            {/* Shape preview overlay */}
            <canvas
              ref={overlayRef}
              width={1200}
              height={700}
              className="wb-canvas wb-overlay-canvas"
              style={{ pointerEvents: 'none' }}
            />
            {/* Remote cursors */}
            {Object.entries(cursors).map(([id, c]) => {
              const canvas = canvasRef.current;
              if (!canvas) return null;
              const rect = canvas.getBoundingClientRect();
              const scaleX = rect.width / canvas.width;
              const scaleY = rect.height / canvas.height;
              return (
                <div
                  key={id}
                  className="wb-remote-cursor"
                  style={{ left: c.x * scaleX, top: c.y * scaleY }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16"><path d="M0 0 L0 12 L4 9 L7 15 L9 14 L6 8 L11 8 Z" fill="#e74c3c" /></svg>
                  <span className="wb-cursor-name">{c.name}</span>
                </div>
              );
            })}
            {/* Text input overlay */}
            {textInput && (
              <div
                className="wb-text-input-wrap"
                style={{
                  left: textInput.x * (canvasRef.current?.getBoundingClientRect().width / canvasRef.current?.width || 1),
                  top: textInput.y * (canvasRef.current?.getBoundingClientRect().height / canvasRef.current?.height || 1),
                }}
              >
                <input
                  autoFocus
                  className="wb-text-input"
                  value={textValue}
                  onChange={e => setTextValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitText(); if (e.key === 'Escape') setTextInput(null); }}
                  onBlur={commitText}
                  placeholder="Type here…"
                  style={{ fontSize: `${size * 4 + 8}px`, color }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
