import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE } from '../config';
import LanguageSelector from './LanguageSelector';
import useRipple from '../hooks/useRipple';
import './Form.css';

function JoinRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const ripple = useRipple();
  const [formData, setFormData] = useState({
    participantName: '',
    participantEmail: '',
    roomId: '',
    passcode: ''
  });
  const [translationLanguage, setTranslationLanguage] = useState('es');
  const [speakerLanguage, setSpeakerLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Pre-fill room ID if passed from home page
    if (location.state?.roomId) {
      setFormData(prev => ({
        ...prev,
        roomId: location.state.roomId
      }));
    }
  }, [location.state]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('🚪 Joining room with API:', API_BASE);

    try {
      // Verify room and passcode
      const response = await fetch(`${API_BASE}/rooms/${formData.roomId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passcode: formData.passcode }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Room verification successful');

        // Check meeting start time
        const { room: roomInfo } = data;
        if (roomInfo?.meetingDate && roomInfo?.meetingTime) {
          try {
            const startDt = new Date(`${roomInfo.meetingDate}T${roomInfo.meetingTime}:00`);
            const now = new Date();
            if (now < startDt) {
              const minutesUntil = Math.ceil((startDt - now) / 60000);
              setError(`Meeting hasn't started yet. Scheduled for ${roomInfo.meetingDate} at ${roomInfo.meetingTime} (in ${minutesUntil} min).`);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn('Could not parse meeting time:', e);
          }
        }

        // Room verified, navigate to the room
        navigate(`/room/${formData.roomId}`, {
          state: {
            participantName: formData.participantName,
            participantEmail: formData.participantEmail,
            passcode: formData.passcode,
            isHost: false,
            translationLanguage,
            speakerLanguage
          }
        });
      } else {
        console.error('❌ Room verification failed:', data.error);
        setError(data.error || 'Failed to join room');
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h1>Join Room</h1>
        <p>Enter the room details to join the meeting</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="participantName">Participant Name *</label>
            <input
              type="text"
              id="participantName"
              name="participantName"
              value={formData.participantName}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="participantEmail">Participant Email *</label>
            <input
              type="email"
              id="participantEmail"
              name="participantEmail"
              value={formData.participantEmail}
              onChange={handleChange}
              required
              placeholder="Enter your email address"
            />
          </div>

          <div className="form-group">
            <label htmlFor="roomId">Room ID *</label>
            <input
              type="text"
              id="roomId"
              name="roomId"
              value={formData.roomId}
              onChange={handleChange}
              required
              placeholder="Enter the room ID"
            />
          </div>

          <div className="form-group">
            <label htmlFor="passcode">Room Passcode *</label>
            <input
              type="password"
              id="passcode"
              name="passcode"
              value={formData.passcode}
              onChange={handleChange}
              required
              placeholder="Enter the room passcode"
            />
          </div>

          <LanguageSelector
            selectedLanguage={speakerLanguage}
            onLanguageChange={setSpeakerLanguage}
            label="🗣️ I speak (your language):"
          />

          <LanguageSelector
            selectedLanguage={translationLanguage}
            onLanguageChange={setTranslationLanguage}
            label="🌐 I want to hear (translation language):"
          />

          <div className="form-actions">
            <button
              type="button"
              onClick={(e) => { ripple(e); navigate('/'); }}
              className="btn btn-secondary ripple-host"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              onClick={ripple}
              className={`btn btn-primary ripple-host${loading ? ' btn-loading' : ''}`}
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default JoinRoom;