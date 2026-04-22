import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config';
import useScrollReveal from '../hooks/useScrollReveal';
import useRipple from '../hooks/useRipple';
import './Home.css';

// Import test for configuration verification
import '../test-config';

function Home() {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const revealRef   = useScrollReveal();
  const ripple      = useRipple();

  useEffect(() => {
    fetchUpcomingEvents(true);

    // Poll every 10 seconds so other tabs/devices see new rooms without a manual refresh
    const pollInterval = setInterval(fetchUpcomingEvents, 10000);

    // Also refresh immediately when the user switches back to this tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchUpcomingEvents();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const fetchUpcomingEvents = async (showLoader = false) => {
    if (showLoader) setEventsLoading(true);
    console.log('📅 Fetching upcoming events from:', API_BASE);
    try {
      const response = await fetch(`${API_BASE}/rooms`);
      const serverRooms = await response.json();
      console.log('✅ Fetched rooms from server:', serverRooms.length);

      // Merge with locally saved rooms (created on this device)
      const localRooms = JSON.parse(localStorage.getItem('createdRooms') || '[]');
      const serverIds = new Set(serverRooms.map(r => r.id));
      // Only add local rooms that aren't already in the server response
      const localOnly = localRooms.filter(r => !serverIds.has(r.id));
      const merged = [...serverRooms, ...localOnly];

      setUpcomingEvents(merged);
    } catch (error) {
      console.error('❌ Error fetching rooms:', error);
      // Fallback to local rooms if server is unreachable
      const localRooms = JSON.parse(localStorage.getItem('createdRooms') || '[]');
      setUpcomingEvents(localRooms);
    } finally {
      setEventsLoading(false);
    }
  };

  return (
    <div className="home-container" ref={revealRef}>
      <div className="home-background">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
          <div className="shape shape-5"></div>
        </div>
      </div>

      <header className="home-header">
        <div className="logo-section">
          <div className="logo-icon">📹</div>
          <h1>VideoMeet Pro</h1>
        </div>
        <p className="tagline">Connect, Collaborate, Create Together</p>
        <div className="feature-badges">
          <span className="badge reveal">🎥 HD Video</span>
          <span className="badge reveal">🎤 Crystal Audio</span>
          <span className="badge reveal">🔒 Secure</span>
          <span className="badge reveal">📱 Cross-Platform</span>
        </div>
        <Link to="/history" className="history-link-btn ripple-host" onClick={ripple}>
          📋 Meeting History
        </Link>
      </header>

      <div className="main-options">
        <div className="option-card create-card reveal">
          <div className="card-icon">🚀</div>
          <h2>Create Room</h2>
          <p>Start a new video meeting and invite others to join your session</p>
          <div className="card-features">
            <span>✓ Instant room creation</span>
            <span>✓ Admin controls</span>
            <span>✓ Screen sharing</span>
          </div>
          <Link to="/create-room" className="btn btn-primary ripple-host" onClick={ripple}>
            <span className="btn-icon">➕</span>
            Create New Room
          </Link>
        </div>

        <div className="option-card join-card reveal">
          <div className="card-icon">🔗</div>
          <h2>Join Room</h2>
          <p>Join an existing meeting with Room ID and start collaborating</p>
          <div className="card-features">
            <span>✓ Quick join process</span>
            <span>✓ No downloads required</span>
            <span>✓ Works on any device</span>
          </div>
          <Link to="/join-room" className="btn btn-secondary ripple-host" onClick={ripple}>
            <span className="btn-icon">🚪</span>
            Join Existing Room
          </Link>
        </div>
      </div>

      <div className="upcoming-events">
        <div className="section-header reveal">
          <h2>📅 Upcoming Meetings</h2>
          <p>Your scheduled video conferences</p>
        </div>

        {eventsLoading ? (
          <div className="events-skeleton">
            {[1, 2, 3].map(i => (
              <div key={i} className="event-card-skeleton">
                <div className="skeleton sk-title" />
                <div className="skeleton sk-line" />
                <div className="skeleton sk-line sk-short" />
              </div>
            ))}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="no-events reveal">
            <div className="no-events-icon">📭</div>
            <h3>No upcoming meetings</h3>
            <p>Create a new room to get started with your first video conference</p>
          </div>
        ) : (
          <div className="events-list">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="event-card reveal">
                <div className="event-header">
                  <div className="event-icon">🎯</div>
                  <div className="event-info">
                    <h3>Room: {event.id}</h3>
                    <p className="host-name">Hosted by {event.creatorName}</p>
                  </div>
                </div>
                <div className="event-details">
                  <div className="detail-item">
                    <span className="detail-icon">📅</span>
                    <span>{event.meetingDate}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-icon">🕒</span>
                    <span>{event.meetingTime}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-icon">👥</span>
                    <span>{event.participantCount} participants</span>
                  </div>
                </div>
                <Link
                  to="/join-room"
                  state={{ roomId: event.id }}
                  className="btn btn-outline event-join-btn ripple-host"
                  onClick={ripple}
                >
                  <span className="btn-icon">🚀</span>
                  Join Meeting
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="home-footer reveal">
        <div className="footer-content">
          <p>© 2024 VideoMeet Pro - Secure Video Conferencing</p>
          <div className="footer-links">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;