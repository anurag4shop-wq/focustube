const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const initGoogleAuth = (onSuccess, onError) => {
  if (!window.google) {
    onError(new Error("Google Identity Services failed to load. Please disable tracking blockers."));
    return null;
  }
  
  if (!CLIENT_ID || CLIENT_ID.trim() === '' || CLIENT_ID.includes('your_client_id_here')) {
    onError(new Error("Missing Google Client ID. Please configure .env.local correctly."));
    return null;
  }

  try {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/youtube.readonly',
      callback: (tokenResponse) => {
        if (tokenResponse.error !== undefined) {
          onError(tokenResponse);
        } else {
          localStorage.setItem('yt_access_token', tokenResponse.access_token);
          localStorage.setItem('yt_token_expiry', Date.now() + tokenResponse.expires_in * 1000);
          onSuccess(tokenResponse.access_token);
        }
      },
    });

    return tokenClient;
  } catch (error) {
    onError(error);
    return null;
  }
};

export const getValidToken = () => {
  const token = localStorage.getItem('yt_access_token');
  const expiry = localStorage.getItem('yt_token_expiry');
  if (token && expiry && Date.now() < parseInt(expiry, 10)) {
    return token;
  }
  localStorage.removeItem('yt_access_token');
  localStorage.removeItem('yt_token_expiry');
  return null;
};

export const logout = () => {
  const token = getValidToken();
  if (token && window.google) {
    window.google.accounts.oauth2.revoke(token, () => {});
  }
  localStorage.removeItem('yt_access_token');
  localStorage.removeItem('yt_token_expiry');
};

// --- DATA FETCHING ---

const CACHE_KEY_PREFIX = 'focustube_';
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour

const fetchWithAuth = async (url) => {
  const token = getValidToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'API request failed');
  }

  return response.json();
};

const getCache = (key) => {
  const cached = localStorage.getItem(CACHE_KEY_PREFIX + key);
  if (!cached) return null;
  const parsed = JSON.parse(cached);
  if (Date.now() > parsed.expiry) {
    localStorage.removeItem(CACHE_KEY_PREFIX + key);
    return null;
  }
  return parsed.data;
};

const setCache = (key, data) => {
  localStorage.setItem(
    CACHE_KEY_PREFIX + key,
    JSON.stringify({ data, expiry: Date.now() + CACHE_EXPIRY })
  );
};

export const fetchSubscriptionVideos = async () => {
  const cacheKey = 'subscription_videos';
  const cachedData = getCache(cacheKey);
  if (cachedData) return cachedData;

  try {
    // Fetch subscriptions
    const subUrl = `https://youtube.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50`;
    const subData = await fetchWithAuth(subUrl);
    
    const channelIds = subData.items.map(item => item.snippet.resourceId.channelId);
    const channelMap = {};
    subData.items.forEach(item => {
      channelMap[item.snippet.resourceId.channelId] = {
        channelTitle: item.snippet.title,
        channelThumbnail: item.snippet.thumbnails?.default?.url
      };
    });

    // Fetch latest videos from uploads playlist of each channel
    const playlistPromises = channelIds.map(channelId => {
      const uploadsPlaylistId = channelId.replace(/^UC/, 'UU');
      const url = `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=3`;
      return fetchWithAuth(url).catch(() => null); // ignore individual errors
    });

    const playlistsData = await Promise.all(playlistPromises);
    
    let allVideos = [];
    playlistsData.forEach(data => {
      if (data && data.items) {
        data.items.forEach(item => {
          allVideos.push({
            id: item.contentDetails.videoId,
            title: item.snippet.title,
            publishedAt: item.snippet.publishedAt,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
            channelId: item.snippet.channelId,
            channelTitle: item.snippet.channelTitle,
            channelIcon: channelMap[item.snippet.channelId]?.channelThumbnail
          });
        });
      }
    });

    // Sort by newest
    allVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    setCache(cacheKey, allVideos);
    return allVideos;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
};

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

export const fetchComments = async (videoId) => {
  const url = `https://youtube.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&order=relevance&key=${API_KEY}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to load comments');
  }
  
  const data = await response.json();
  if (!data.items) return [];
  
  return data.items.map(item => {
    const comment = item.snippet.topLevelComment.snippet;
    return {
      id: item.id,
      author: comment.authorDisplayName,
      authorImage: comment.authorProfileImageUrl,
      text: comment.textDisplay,
      likeCount: comment.likeCount,
      publishedAt: comment.publishedAt
    };
  });
};
