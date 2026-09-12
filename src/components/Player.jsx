import { useState, useEffect } from 'react';
import { fetchComments } from '../services/youtube';

export default function Player({ video, onBack }) {
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentsError, setCommentsError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (video) {
      setLoadingComments(true);
      setCommentsError(null);
      fetchComments(video.id)
        .then(data => {
          if (isMounted) setComments(data);
        })
        .catch(err => {
          console.error(err);
          if (isMounted) setCommentsError(err.message || 'Failed to load comments');
        })
        .finally(() => {
          if (isMounted) setLoadingComments(false);
        });
    }
    return () => { isMounted = false; };
  }, [video]);

  // Prevent background scroll when player is open
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (!video) return null;

  return (
    <div className="player-container">
      <button className="back-btn hover-lift" onClick={onBack}>
        ← Back to Feed
      </button>
      
      <div className="video-player-wrapper">
        <iframe
          src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={video.title}
        ></iframe>
      </div>
      
      <div className="video-details">
        <h2>{video.title}</h2>
        <div className="channel-info large">
          {video.channelIcon && <img src={video.channelIcon} alt={video.channelTitle} className="channel-icon" />}
          <span className="channel-name">{video.channelTitle}</span>
        </div>
      </div>

      <div className="comments-section">
        <h3>Comments</h3>
        {loadingComments ? (
          <div className="comments-list">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="comment skeleton" style={{height: '80px', borderRadius: 'var(--radius)'}} />
            ))}
          </div>
        ) : commentsError ? (
          <p className="no-comments" style={{color: 'var(--accent)'}}>Failed to load comments: {commentsError}</p>
        ) : comments.length > 0 ? (
          <div className="comments-list">
            {comments.map(comment => (
              <div key={comment.id} className="comment">
                <img src={comment.authorImage} alt={comment.author} className="comment-avatar" />
                <div className="comment-content">
                  <div className="comment-header">
                    <span className="comment-author">{comment.author}</span>
                    <span className="comment-date">{new Date(comment.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <p dangerouslySetInnerHTML={{__html: comment.text}}></p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-comments">No comments found or comments are disabled.</p>
        )}
      </div>
    </div>
  );
}
