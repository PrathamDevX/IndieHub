import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  Disc3,
  Edit2,
  Heart,
  ListMusic,
  LoaderCircle,
  MessageSquare,
  Pause,
  Play,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { deletePlaylist, getPlaylist, removeSongFromPlaylist, updatePlaylist } from '../services/playlistService'
import { likeSong, unlikeSong } from '../services/catalogService'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'
import ConfirmModal from '../components/admin/ConfirmModal'
import SongCommentsDrawer from '../components/comments/SongCommentsDrawer'

function formatDuration(sec) {
  if (!sec || isNaN(sec)) return '—'
  const mins = Math.floor(sec / 60)
  const rem = Math.floor(sec % 60)
  return `${mins}:${rem < 10 ? '0' : ''}${rem}`
}

function formatDate(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PlaylistPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { currentSong, isPlaying, playSong, playQueue, togglePlay, updateSongLikeStatus } = usePlayer()
  const navigate = useNavigate()

  const [playlist, setPlaylist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [discussionSong, setDiscussionSong] = useState(null)

  useEffect(() => {
    loadPlaylist()
  }, [id])

  async function loadPlaylist() {
    setLoading(true)
    setError('')
    try {
      const data = await getPlaylist(id)
      setPlaylist(data)
      setEditName(data.name)
      setEditDesc(data.description || '')
    } catch (err) {
      setError(err.response?.data?.message || 'Playlist could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveSong(songId) {
    try {
      await removeSongFromPlaylist(playlist.id, songId)
      setPlaylist((prev) => ({
        ...prev,
        songCount: prev.songCount - 1,
        songs: prev.songs.filter((s) => s.id !== songId),
      }))
    } catch (err) {
      console.error('Failed to remove song:', err)
    }
  }

  async function handleToggleSongLike(song) {
    if (!user) {
      navigate('/login')
      return
    }
    try {
      if (song.isLiked) {
        const res = await unlikeSong(song.id)
        updateSongLikeStatus(song.id, false, res.data.likeCount)
        setPlaylist((prev) => ({
          ...prev,
          songs: prev.songs.map((s) =>
            s.id === song.id ? { ...s, isLiked: false, likeCount: res.data.likeCount } : s
          ),
        }))
      } else {
        const res = await likeSong(song.id)
        updateSongLikeStatus(song.id, true, res.data.likeCount)
        setPlaylist((prev) => ({
          ...prev,
          songs: prev.songs.map((s) =>
            s.id === song.id ? { ...s, isLiked: true, likeCount: res.data.likeCount } : s
          ),
        }))
      }
    } catch (err) {
      console.error('Like toggle failed:', err)
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!editName.trim()) return
    setSavingEdit(true)
    setEditError('')
    try {
      await updatePlaylist(playlist.id, {
        name: editName.trim(),
        description: editDesc.trim(),
      })
      setPlaylist((prev) => ({
        ...prev,
        name: editName.trim(),
        description: editDesc.trim() || null,
      }))
      setShowEditModal(false)
    } catch (err) {
      setEditError(err.response?.data?.message || 'Could not update playlist.')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true)
    try {
      await deletePlaylist(playlist.id)
      navigate('/library')
    } catch (err) {
      console.error('Delete playlist failed:', err)
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) {
    return (
      <main className="content">
        <div className="catalog-loading" style={{ minHeight: 350 }}>
          <Disc3 size={28} className="spin" />
          <span>Loading playlist...</span>
        </div>
      </main>
    )
  }

  if (error || !playlist) {
    return (
      <main className="content empty-page">
        <p>{error || 'Playlist not found.'}</p>
        <Link className="button-secondary" to="/library">
          Back to library
        </Link>
      </main>
    )
  }

  const totalDurationSecs = playlist.songs.reduce((acc, s) => acc + (s.duration || 0), 0)

  return (
    <main className="content playlist-page">
      <Link className="back-link" to="/library">
        <ArrowLeft size={16} /> Back to library
      </Link>

      {/* Playlist Hero */}
      <section className="playlist-hero">
        <div
          className="playlist-hero-cover"
          style={{
            background: playlist.coverImage
              ? `url(${playlist.coverImage}) center/cover`
              : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          }}
        >
          {!playlist.coverImage && <Disc3 size={54} color="#d1c4f5" />}
        </div>

        <div className="playlist-hero-info">
          <p className="eyebrow"><Sparkles size={14} /> Playlist</p>
          <h1>{playlist.name}</h1>
          {playlist.description && (
            <p className="playlist-hero-desc">{playlist.description}</p>
          )}

          <div className="playlist-hero-meta">
            <span>By <strong>{playlist.userName}</strong></span>
            <span>•</span>
            <span>{playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}</span>
            {totalDurationSecs > 0 && (
              <>
                <span>•</span>
                <span>{Math.round(totalDurationSecs / 60)} min</span>
              </>
            )}
          </div>

          <div className="playlist-hero-actions">
            {playlist.songs.length > 0 && (
              <button
                className="button-primary"
                onClick={() => playQueue(playlist.songs, 0)}
              >
                <Play size={16} fill="currentColor" /> Play all
              </button>
            )}

            {playlist.isOwner && (
              <>
                <button
                  className="button-secondary"
                  onClick={() => setShowEditModal(true)}
                  title="Edit name and description"
                >
                  <Edit2 size={15} /> Edit
                </button>
                <button
                  className="button-secondary playlist-delete-btn"
                  onClick={() => setShowDeleteModal(true)}
                  title="Delete playlist"
                >
                  <Trash2 size={15} /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Playlist Song List */}
      <section className="section">
        {playlist.songs.length === 0 ? (
          <div className="admin-empty-full">
            <ListMusic size={44} color="#a78bfa" />
            <h2>This playlist is empty</h2>
            <p>Discover independent music and add tracks to this playlist.</p>
            <Link to="/discover" className="button-primary" style={{ marginTop: 14 }}>
              Explore songs
            </Link>
          </div>
        ) : (
          <div className="liked-songs-list">
            <div className="liked-list-header">
              <span>#</span>
              <span>Title</span>
              <span>Album</span>
              <span>Added</span>
              <span className="text-right"><Clock size={15} /></span>
              <span className="text-right">Action</span>
            </div>

            {playlist.songs.map((song, idx) => {
              const isCurrent = currentSong?.id === song.id
              return (
                <div
                  key={`${song.id}-${idx}`}
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
                            playSong(song, playlist.songs)
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

                  <span className="liked-album">{song.albumTitle || 'Single'}</span>
                  <span className="liked-genre">{formatDate(song.addedAt)}</span>
                  <span className="liked-duration text-right">{formatDuration(song.duration)}</span>

                  <div className="liked-actions text-right" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button
                      className="liked-heart-btn"
                      onClick={() => setDiscussionSong(song)}
                      title="Discussion"
                    >
                      <MessageSquare size={16} />
                    </button>

                    <button
                      className="liked-heart-btn"
                      onClick={() => handleToggleSongLike(song)}
                      title={song.isLiked ? 'Unlike song' : 'Like song'}
                    >
                      <Heart
                        size={17}
                        fill={song.isLiked ? '#ec4899' : 'none'}
                        color={song.isLiked ? '#ec4899' : '#858093'}
                      />
                    </button>

                    {playlist.isOwner && (
                      <button
                        className="liked-heart-btn"
                        onClick={() => handleRemoveSong(song.id)}
                        title="Remove from playlist"
                        style={{ color: '#f87171' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Edit Playlist Modal */}
      {showEditModal && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-info">
                <Edit2 size={20} color="#a78bfa" />
                <div>
                  <h3>Edit Playlist Details</h3>
                  <p className="modal-song-title">Update title or description</p>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowEditModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div className="form-error" style={{ margin: '0 20px 12px' }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="upload-form" style={{ padding: '0 20px 20px' }}>
              <label>
                Playlist Name
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={150}
                  required
                />
              </label>

              <label>
                Description <span className="optional">(optional)</span>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </label>

              <div className="confirm-modal-actions" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={savingEdit || !editName.trim()}
                >
                  {savingEdit ? <LoaderCircle size={16} className="spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={showDeleteModal}
        title="Delete Playlist"
        message={`Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete Playlist'}
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

      {discussionSong && (
        <SongCommentsDrawer
          song={discussionSong}
          onClose={() => setDiscussionSong(null)}
        />
      )}
    </main>
  )
}
