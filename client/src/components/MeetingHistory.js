import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MeetingHistory.css';

function MeetingHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [activeTab, setActiveTab] = useState('meetings');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('meetingHistory') || '[]');
    setHistory(saved.reverse());

    // Load recordings — blob URLs are valid within the same browser session
    // They only expire after page reload/tab close, so we just load them as-is
    const savedRec = JSON.parse(localStorage.getItem('meetingRecordings') || '[]');
    setRecordings(savedRec.reverse());
  }, []);

  const deleteHistoryItem = (id) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('meetingHistory', JSON.stringify([...updated].reverse()));
  };

  const deleteRecording = (id) => {
    const updated = recordings.filter(r => r.id !== id);
    setRecordings(updated);
    localStorage.setItem('meetingRecordings', JSON.stringify([...updated].reverse()));
  };

  const clearAll = () => {
    if (window.confirm('Clear all meeting history?')) {
      setHistory([]);
      localStorage.removeItem('meetingHistory');
    }
  };

  const clearAllRecordings = () => {
    if (window.confirm('Clear all recording history?')) {
      setRecordings([]);
      localStorage.removeItem('meetingRecordings');
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="history-container">
      <div className="history-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <h1>📋 Meeting History</h1>
      </div>

      <div className="history-tabs">
        <button
          className={`tab-btn ${activeTab === 'meetings' ? 'active' : ''}`}
          onClick={() => setActiveTab('meetings')}
        >
          📅 Meetings ({history.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'recordings' ? 'active' : ''}`}
          onClick={() => setActiveTab('recordings')}
        >
          🎥 Recordings ({recordings.length})
        </button>
      </div>

      {activeTab === 'meetings' && (
        <div className="history-content">
          {history.length > 0 && (
            <div className="history-actions">
              <button className="clear-btn" onClick={clearAll}>🗑️ Clear All</button>
            </div>
          )}
          {history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No meeting history yet</h3>
              <p>Your past meetings will appear here</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map(item => (
                <div key={item.id} className="history-card">
                  <div className="history-card-header">
                    <div className="room-badge">Room: {item.roomId}</div>
                    <div className={`role-badge ${item.isHost ? 'host' : 'participant'}`}>
                      {item.isHost ? '👑 Host' : '👤 Participant'}
                    </div>
                    <button className="delete-item-btn" onClick={() => deleteHistoryItem(item.id)}>✕</button>
                  </div>
                  <div className="history-card-body">
                    <div className="history-detail">
                      <span className="detail-label">👤 Name</span>
                      <span>{item.participantName}</span>
                    </div>
                    <div className="history-detail">
                      <span className="detail-label">📅 Date</span>
                      <span>{item.date}</span>
                    </div>
                    <div className="history-detail">
                      <span className="detail-label">🕒 Joined</span>
                      <span>{item.joinedAt}</span>
                    </div>
                    <div className="history-detail">
                      <span className="detail-label">🕔 Left</span>
                      <span>{item.leftAt || 'N/A'}</span>
                    </div>
                    <div className="history-detail">
                      <span className="detail-label">⏱️ Duration</span>
                      <span>{formatDuration(item.duration)}</span>
                    </div>
                    {item.recordingCount > 0 && (
                      <div className="history-detail">
                        <span className="detail-label">🎥 Recordings</span>
                        <span>{item.recordingCount} file(s)</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'recordings' && (
        <div className="history-content">
          {recordings.length > 0 && (
            <div className="history-actions">
              <p className="recordings-note">
                ℹ️ Recordings are available in this browser session. Download before closing the tab to save permanently.
              </p>
              <button className="clear-btn" onClick={clearAllRecordings}>🗑️ Clear All</button>
            </div>
          )}
          {recordings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎬</div>
              <h3>No recordings yet</h3>
              <p>Screen recordings from your meetings will appear here</p>
            </div>
          ) : (
            <div className="recordings-grid">
              {recordings.map(rec => (
                <div key={rec.id} className="recording-card">
                  <div className="recording-card-header">
                    <span className="recording-room">Room: {rec.roomId}</span>
                    <button className="delete-item-btn" onClick={() => deleteRecording(rec.id)}>✕</button>
                  </div>
                  <div className="recording-preview-area">
                    {rec.urlExpired || !rec.url ? (
                      <div className="recording-expired">
                        <div className="expired-icon">⚠️</div>
                        <p>Recording expired</p>
                        <small>Download during the meeting to keep recordings.</small>
                      </div>
                    ) : (
                      <video
                        src={rec.url}
                        controls
                        width="100%"
                        style={{ borderRadius: '8px', maxHeight: '200px' }}
                      />
                    )}
                  </div>
                  <div className="recording-meta">
                    <div className="history-detail">
                      <span className="detail-label">👤</span>
                      <span>{rec.participantName}</span>
                    </div>
                    <div className="history-detail">
                      <span className="detail-label">📅</span>
                      <span>{rec.timestamp}</span>
                    </div>
                    <div className="history-detail">
                      <span className="detail-label">⏱️</span>
                      <span>{formatDuration(rec.duration)}</span>
                    </div>
                  </div>
                  {!rec.urlExpired && rec.url && (
                    <a
                      href={rec.url}
                      download={rec.filename}
                      className="download-recording-btn"
                    >
                      📥 Download
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MeetingHistory;
