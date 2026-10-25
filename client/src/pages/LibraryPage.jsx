import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Disc3,
  FolderPlus,
  Globe,
  Heart,
  ListMusic,
  LoaderCircle,
  Play,
  Plus,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react'
import { createPlaylist, getMyPlaylists, getPlaylists } from '../services/playlistService'
import { getLikedSongs, getFollowedArtists } from '../services/catalogService'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'

export default function LibraryPage() {
  const { user } = useAuth()
  const { playQueue } = usePlayer()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('my') // 'my' | 'community'
  const [myPlaylists, setMyPlaylists] = useState([])
  const [communityPlaylists, setCommunityPlaylists] = useState([])
  const [likedCount, setLikedCount] = useState(0)
  const [followedCount, setFollowedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Create playlist modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    loadLibraryData()
  }, [])

  async function loadLibraryData() {
    setLoading(true)
    setError('')
    try {
      const [playlists, publicPlaylists, liked, followed] = await Promise.all([
        getMyPlaylists().catch(() => []),
        getPlaylists().catch(() => []),
        getLikedSongs().catch(() => []),
        getFollowedArtists().catch(() => []),
      ])

      setMyPlaylists(playlists)
      setCommunityPlaylists(publicPlaylists)
      setLikedCount(liked.length)
      setFollowedCount(followed.length)
    } catch (err) {
      setError('Could not load library details.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreatePlaylist(e) {
    e.preventDefault()
    if (!createName.trim()) return
    setCreating(true)
    setCreateError('')
    try {
      const res = await createPlaylist({
        name: createName.trim(),
        description: createDesc.trim(),
      })
      setShowCreateModal(false)
      setCreateName('')
      setCreateDesc('')
      navigate(`/playlists/${res.data.playlistId}`)
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Could not create playlist.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="content library-page">
      <div className="page-heading library-header">
        <div>
          <p className="eyebrow"><Sparkles size={14} /> Personal collection</p>
          <h1>Your Library</h1>
        </div>
        <button
          className="button-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={16} /> New playlist
        </button>
      </div>

      {/* Quick Access Hero Hub */}
      <div className="library-quick-grid">
        <Link to="/liked" className="library-hub-card library-hub-card--liked">
          <div className="library-hub-icon">
            <Heart size={28} fill="#ec4899" color="#ec4899" />
          </div>
          <div className="library-hub-info">
            <strong>Liked Songs</strong>
            <span>{likedCount} {likedCount === 1 ? 'song' : 'songs'} saved</span>
          </div>
        </Link>

        <Link to="/followed" className="library-hub-card library-hub-card--artists">
          <div className="library-hub-icon">
            <UserCheck size={28} color="#a78bfa" />
          </div>
          <div className="library-hub-info">
            <strong>Followed Artists</strong>
            <span>{followedCount} {followedCount === 1 ? 'artist' : 'artists'} followed</span>
          </div>
        </Link>
      </div>

      {/* Library Tabs */}
      <div className="library-tabs">
        <button
          className={`library-tab-btn ${activeTab === 'my' ? 'library-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('my')}
        >
          <ListMusic size={16} /> Your Playlists ({myPlaylists.length})
        </button>
        <button
          className={`library-tab-btn ${activeTab === 'community' ? 'library-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('community')}
        >
          <Globe size={16} /> Community Playlists
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="catalog-loading">
          <Disc3 size={24} className="spin" />
          <span>Loading your library...</span>
        </div>
      ) : activeTab === 'my' ? (
        myPlaylists.length === 0 ? (
          <div className="admin-empty-full">
            <ListMusic size={48} color="#a78bfa" />
            <h2>Create your first playlist</h2>
            <p>Group tracks into personalized playlists for every mood, vibe, or occasion.</p>
            <button
              className="button-primary"
              style={{ marginTop: 14 }}
              onClick={() => setShowCreateModal(true)}
            >
              <FolderPlus size={16} /> Create playlist
            </button>
          </div>
        ) : (
          <div className="playlist-grid">
            {myPlaylists.map((pl) => (
              <Link to={`/playlists/${pl.id}`} key={pl.id} className="playlist-card">
                <div
                  className="playlist-card-cover"
                  style={{
                    background: pl.coverImage
                      ? `url(${pl.coverImage}) center/cover`
                      : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  }}
                >
                  {!pl.coverImage && <Disc3 size={40} />}
                </div>
                <strong className="playlist-card-title">{pl.name}</strong>
                <span className="playlist-card-meta">
                  {pl.songCount} {pl.songCount === 1 ? 'song' : 'songs'}
                  {pl.description ? ` · ${pl.description}` : ''}
                </span>
              </Link>
            ))}
          </div>
        )
      ) : (
        communityPlaylists.length === 0 ? (
          <div className="catalog-empty">No community playlists available yet.</div>
        ) : (
          <div className="playlist-grid">
            {communityPlaylists.map((pl) => (
              <Link to={`/playlists/${pl.id}`} key={pl.id} className="playlist-card">
                <div
                  className="playlist-card-cover"
                  style={{
                    background: pl.coverImage
                      ? `url(${pl.coverImage}) center/cover`
                      : 'linear-gradient(135deg, #1e1b4b, #4338ca)',
                  }}
                >
                  {!pl.coverImage && <Disc3 size={40} />}
                </div>
                <strong className="playlist-card-title">{pl.name}</strong>
                <span className="playlist-card-meta">
                  By {pl.userName} · {pl.songCount} {pl.songCount === 1 ? 'song' : 'songs'}
                </span>
              </Link>
            ))}
          </div>
        )
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-info">
                <FolderPlus size={20} color="#a78bfa" />
                <div>
                  <h3>Create New Playlist</h3>
                  <p className="modal-song-title">Organize your favorite songs</p>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="form-error" style={{ margin: '0 20px 12px' }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreatePlaylist} className="upload-form" style={{ padding: '0 20px 20px' }}>
              <label>
                Playlist Name
                <input
                  type="text"
                  placeholder="e.g., Late Night Focus"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  maxLength={150}
                  required
                  autoFocus
                />
              </label>

              <label>
                Description <span className="optional">(optional)</span>
                <textarea
                  placeholder="Give your playlist a mood or description..."
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </label>

              <div className="confirm-modal-actions" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={creating || !createName.trim()}
                >
                  {creating ? <LoaderCircle size={16} className="spin" /> : 'Create Playlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
