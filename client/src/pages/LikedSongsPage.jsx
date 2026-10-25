import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock, Disc3, Heart, ListPlus, MessageSquare, Pause, Play, Sparkles } from 'lucide-react'
import { getLikedSongs, unlikeSong } from '../services/catalogService'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import AddToPlaylistModal from '../components/playlist/AddToPlaylistModal'
import SongCommentsDrawer from '../components/comments/SongCommentsDrawer'

export default function LikedSongsPage() {
  const { user } = useAuth()
  const { currentSong, isPlaying, playSong, playQueue, togglePlay, updateSongLikeStatus } = usePlayer()
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [playlistSong, setPlaylistSong] = useState(null)
  const [discussionSong, setDiscussionSong] = useState(null)

  useEffect(() => {
    loadSongs()
  }, [])

  async function loadSongs() {
    setLoading(true)
    setError('')
    try {
      const data = await getLikedSongs()
      setSongs(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your liked songs.')
    } finally {
      setLoading(false)
    }
  }

  async function handleUnlike(songId) {
    try {
      await unlikeSong(songId)
      updateSongLikeStatus(songId, false)
      setSongs((prev) => prev.filter((s) => s.id !== songId))
    } catch (err) {
      console.error('Failed to unlike song:', err)
    }
  }

  function formatDuration(sec) {
    if (!sec) return '—'
    const mins = Math.floor(sec / 60)
    const rem = sec % 60
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`
  }

  return (
    <main className="content liked-songs-page">
      <Link className="back-link" to="/discover">
        <ArrowLeft size={16} /> Back to discover
      </Link>

      <div className="liked-hero">
        <div className="liked-hero-art">
          <Heart size={44} fill="#ec4899" color="#ec4899" />
        </div>
        <div className="liked-hero-info">
          <p className="eyebrow"><Sparkles size={14} /> Playlist</p>
          <h1>Liked Songs</h1>
          <p className="liked-hero-meta">
            <span>{user?.name || 'Listener'}</span>
            <span>•</span>
            <span>{songs.length} {songs.length === 1 ? 'song' : 'songs'}</span>
          </p>
          {songs.length > 0 && (
            <button
              className="button-primary"
              style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onClick={() => playQueue(songs, 0)}
            >
              <Play size={16} fill="currentColor" /> Play all
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="catalog-loading">
          <Disc3 size={24} className="spin" />
          <span>Loading your liked songs...</span>
        </div>
      ) : error ? (
        <div className="form-error">{error}</div>
      ) : songs.length === 0 ? (
        <div className="admin-empty-full">
          <Heart size={48} color="#ec4899" />
          <h2>Songs you like will appear here</h2>
          <p>Save tracks you love by tapping the heart icon while listening.</p>
          <Link to="/discover" className="button-primary" style={{ marginTop: 12 }}>
            Explore music
          </Link>
        </div>
      ) : (
        <div className="liked-songs-list">
          <div className="liked-list-header">
            <span>#</span>
            <span>Title</span>
            <span>Album</span>
            <span>Genre</span>
            <span className="text-right"><Clock size={15} /></span>
            <span className="text-right">Action</span>
          </div>

          {songs.map((song, idx) => {
            const isCurrent = currentSong?.id === song.id
            return (
              <div
                key={song.id}
                className={`liked-song-row ${isCurrent ? 'liked-song-row--active' : ''}`}
              >
                <span className="liked-idx">{idx + 1}</span>
                <div className="liked-track-meta">
                  <div className="liked-track-thumb">
                    {song.coverImage ? (
                      <img src={song.coverImage} alt={song.title} />
                    ) : (
                      <Disc3 size={20} />
                    )}
                    <button
                      className={`liked-play-overlay ${isCurrent && isPlaying ? 'cover-play--active' : ''}`}
                      title={isCurrent && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
                      onClick={() => {
                        if (isCurrent) {
                          togglePlay()
                        } else {
                          playSong(song, songs)
                        }
                      }}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause size={14} fill="currentColor" />
                      ) : (
                        <Play size={14} fill="currentColor" />
                      )}
                    </button>
                  </div>
                  <div>
                    <strong>{song.title}</strong>
                    <Link to={`/artists/${song.artistId}`} className="liked-artist-link">
                      {song.artistName}
                    </Link>
                  </div>
                </div>

                <span className="liked-album">{song.albumTitle || '—'}</span>
                <span className="liked-genre">{song.genre || '—'}</span>
                <span className="liked-duration text-right">{formatDuration(song.duration)}</span>

                <div className="liked-actions text-right" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button
                    className="liked-heart-btn"
                    onClick={() => setDiscussionSong(song)}
                    title="Discussion"
                  >
                    <MessageSquare size={17} />
                  </button>
                  <button
                    className="liked-heart-btn"
                    onClick={() => setPlaylistSong(song)}
                    title="Add to playlist"
                  >
                    <ListPlus size={18} />
                  </button>
                  <button
                    className="liked-heart-btn"
                    onClick={() => handleUnlike(song.id)}
                    title="Remove from Liked Songs"
                  >
                    <Heart size={18} fill="#ec4899" color="#ec4899" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {playlistSong && (
        <AddToPlaylistModal
          song={playlistSong}
          onClose={() => setPlaylistSong(null)}
        />
      )}

      {discussionSong && (
        <SongCommentsDrawer
          song={discussionSong}
          onClose={() => setDiscussionSong(null)}
        />
      )}
    </main>
  )
}
