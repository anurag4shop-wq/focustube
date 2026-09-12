import { useState, useEffect } from 'react';
import { fetchSubscriptionVideos } from '../services/youtube';

export default function Feed({ onVideoSelect }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadVideos = async () => {
      try {
        setLoading(true);
        const data = await fetchSubscriptionVideos();
        if (isMounted) {
          setVideos(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load videos');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadVideos();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="feed-grid">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="video-card skeleton" style={{height: '240px', cursor: 'default'}} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message glass">
        <h3>Oops!</h3>
        <p>{error}</p>
        <button className="login-btn hover-lift" onClick={() => window.location.reload()} style={{marginTop: '1rem'}}>
          Try Again
        </button>
      </div>
    );
  }

  if (videos.length === 0) {
    return <div className="error-message">No videos found. Subscribe to some channels!</div>;
  }

  return (
    <div className="feed-grid">
      {videos.map(video => (
        <div key={`${video.channelId}-${video.id}`} className="video-card hover-lift" onClick={() => onVideoSelect(video)}>
          <div className="thumbnail-wrapper">
            <img src={video.thumbnail} alt={video.title} loading="lazy" />
          </div>
          <div className="video-info">
            <h3 className="video-title">{video.title}</h3>
            <div className="channel-info">
              {video.channelIcon && <img src={video.channelIcon} alt={video.channelTitle} className="channel-icon" />}
              <span className="channel-name">{video.channelTitle}</span>
            </div>
            <span className="publish-date">{new Date(video.publishedAt).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
