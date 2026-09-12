import { useState, useEffect, useRef } from 'react'
import { initGoogleAuth, getValidToken, logout } from './services/youtube'
import Feed from './components/Feed'
import Player from './components/Player'
import './App.css'

function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'dark';
  })

  const [token, setToken] = useState(getValidToken());
  const [loginError, setLoginError] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null); // null = Feed view, obj = Player view
  const tokenClientRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const loadGsi = () => {
      if (window.google) {
        tokenClientRef.current = initGoogleAuth(
          (accessToken) => {
            setToken(accessToken);
            setLoginError(null);
          },
          (error) => {
            console.error("Login failed:", error);
            setLoginError(error.message || "Failed to initialize Google Auth");
          }
        );
      } else {
        setTimeout(loadGsi, 500);
      }
    };
    loadGsi();
  }, []);

  const toggleTheme = () => {
    if (!document.startViewTransition) {
      setTheme(prev => prev === 'light' ? 'dark' : 'light');
      return;
    }
    document.startViewTransition(() => {
      setTheme(prev => prev === 'light' ? 'dark' : 'light');
    });
  }

  const handleLogin = () => {
    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken();
    } else {
      console.error("Google Auth client not initialized yet.");
    }
  }

  const handleLogout = () => {
    logout();
    setToken(null);
    setActiveVideo(null);
  }

  const handleVideoSelect = (video) => {
    // Smooth transition to player view
    if (document.startViewTransition) {
      document.startViewTransition(() => setActiveVideo(video));
    } else {
      setActiveVideo(video);
    }
  }

  const handleBackToFeed = () => {
    if (document.startViewTransition) {
      document.startViewTransition(() => setActiveVideo(null));
    } else {
      setActiveVideo(null);
    }
  }

  return (
    <div className="app-container">
      <header className="navbar">
        <div className="logo" onClick={handleBackToFeed} style={{cursor: 'pointer'}}>
          FocusTube
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          {token && (
            <button className="theme-toggle hover-lift" onClick={handleLogout} style={{backgroundColor: 'transparent', border: '1px solid var(--border-color)'}}>
              Logout
            </button>
          )}
          <button className="theme-toggle hover-lift" onClick={toggleTheme}>
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </header>
      
      <main className="main-content">
        {!token ? (
          <section className="hero">
            <h1>Your Subscriptions.<br/>Zero Distractions.</h1>
            <p>Login with Google to watch your feed without recommendations, shorts, or algorithm clutter.</p>
            <button className="login-btn hover-lift" onClick={handleLogin}>Login with Google</button>
            {loginError && (
              <div style={{color: 'var(--accent)', marginTop: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: 'var(--radius)'}}>
                {loginError}
              </div>
            )}
          </section>
        ) : (
          <section className="feed" style={{width: '100%'}}>
            {activeVideo ? (
              <Player video={activeVideo} onBack={handleBackToFeed} />
            ) : (
              <Feed onVideoSelect={handleVideoSelect} />
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default App
