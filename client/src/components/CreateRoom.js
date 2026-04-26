import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import LanguageSelector from './LanguageSelector';
import useRipple from '../hooks/useRipple';
import './Form.css';

function CreateRoom() {
  const navigate = useNavigate();
  const ripple = useRipple();
  const [formData, setFormData] = useState({
    creatorName: '',
    creatorEmail: '',
    roomName: '',
    roomId: '',
    passcode: '',
    meetingDate: '',
    meetingTime: '',
    meetingEndTime: ''
  });
  const [translationLanguage, setTranslationLanguage] = useState('es');
  const [speakerLanguage, setSpeakerLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const generateRoomId = () => {
    const randomId = Math.random().toString(36).substring(2, 10).toUpperCase();
    setFormData({
      ...formData,
      roomId: randomId
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('🏠 Creating room with API:', API_BASE);

    try {
      // Wake up Render server if it's sleeping (free tier spins down after inactivity)
      // We retry up to 3 times with a delay to handle cold starts (~30s)
      let response;
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          response = await fetch(`${API_BASE}/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });
          break; // success, exit retry loop
        } catch (err) {
          lastError = err;
          console.warn(`⚠️ Attempt ${attempt} failed:`, err.message);
          if (attempt < 3) {
            setError(`Server is waking up... retrying (${attempt}/3)`);
            await new Promise(r => setTimeout(r, 5000)); // wait 5s before retry
          }
        }
      }

      if (!response) throw lastError;

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Room created successfully');
        // Save room to localStorage so it shows in Upcoming Meetings on this device
        const savedRooms = JSON.parse(localStorage.getItem('createdRooms') || '[]');
        savedRooms.push({
          id: formData.roomId,
          roomName: formData.roomName || `${formData.creatorName}'s Meeting`,
          creatorName: formData.creatorName,
          meetingDate: formData.meetingDate,
          meetingTime: formData.meetingTime,
          meetingEndTime: formData.meetingEndTime || null,
          isActive: false,
          participantCount: 0,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('createdRooms', JSON.stringify(savedRooms));

        // Room created successfully, navigate to the room
        navigate(`/room/${formData.roomId}`, {
          state: {
            participantName: formData.creatorName,
            participantEmail: formData.creatorEmail,
            passcode: formData.passcode,
            isHost: true,
            translationLanguage,
            speakerLanguage
          }
        });
      } else {
        console.error('❌ Room creation failed:', data.error);
        setError(data.error || 'Failed to create room');
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
        <h1>Create Room</h1>
        <p>Set up a new video meeting room</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="creatorName">Creator Name *</label>
            <input
              type="text"
              id="creatorName"
              name="creatorName"
              value={formData.creatorName}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="creatorEmail">Creator Email *</label>
            <input
              type="email"
              id="creatorEmail"
              name="creatorEmail"
              value={formData.creatorEmail}
              onChange={handleChange}
              required
              placeholder="Enter your email address"
            />
          </div>

          <div className="form-group">
            <label htmlFor="roomName">Meeting Name *</label>
            <input
              type="text"
              id="roomName"
              name="roomName"
              value={formData.roomName}
              onChange={handleChange}
              required
              placeholder="e.g. Weekly Team Sync"
            />
          </div>

          <div className="form-group">
            <label htmlFor="roomId">Room ID *</label>
            <div className="input-with-button">
              <input
                type="text"
                id="roomId"
                name="roomId"
                value={formData.roomId}
                onChange={handleChange}
                required
                placeholder="Enter unique room ID"
              />
              <button
                type="button"
                onClick={generateRoomId}
                className="btn btn-outline"
              >
                Generate
              </button>
            </div>
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
              placeholder="Enter room passcode"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="meetingDate">Meeting Date *</label>
              <input
                type="date"
                id="meetingDate"
                name="meetingDate"
                value={formData.meetingDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="meetingTime">Start Time *</label>
              <input
                type="time"
                id="meetingTime"
                name="meetingTime"
                value={formData.meetingTime}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="meetingEndTime">End Time</label>
              <input
                type="time"
                id="meetingEndTime"
                name="meetingEndTime"
                value={formData.meetingEndTime}
                onChange={handleChange}
                placeholder="Optional"
              />
            </div>
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
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateRoom;