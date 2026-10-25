import { useEffect, useState } from 'react'
import { Check, Disc3, FolderPlus, ListPlus, LoaderCircle, Plus, X } from 'lucide-react'
import { addSongToPlaylist, createPlaylist, getMyPlaylists } from '../../services/playlistService'

export default function AddToPlaylistModal({ song, onClose, onAdded }) {
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState(null)
  const [addedMap, setAddedMap] = useState({})
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Inline create playlist state
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadPlaylists()
  }, [])

  async function loadPlaylists() {
    setLoading(true)
    setError('')
    try {
      const data = await getMyPlaylists()
      setPlaylists(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your playlists.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(playlist) {
    setAddingId(playlist.id)
    setError('')
    setSuccessMsg('')
    try {
      await addSongToPlaylist(playlist.id, song.id)
      setAddedMap((prev) => ({ ...prev, [playlist.id]: true }))
      setSuccessMsg(`Added "${song.title}" to "${playlist.name}"`)
      if (onAdded) onAdded(playlist.id)
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not add song to playlist.'
      setError(msg)
    } finally {
      setAddingId(null)
    }
  }

  async function handleCreateAndAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await createPlaylist({ name: newName.trim(), description: newDesc.trim() })
      const newPlaylistId = res.data.playlistId
      // Add current song to newly created playlist
      await addSongToPlaylist(newPlaylistId, song.id)
      setAddedMap((prev) => ({ ...prev, [newPlaylistId]: true }))
      setSuccessMsg(`Created "${newName.trim()}" and added "${song.title}"!`)
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
      await loadPlaylists()
      if (onAdded) onAdded(newPlaylistId)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create playlist.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card playlist-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-info">
            <ListPlus size={20} color="#a78bfa" />
            <div>
              <h3>Add to Playlist</h3>
              <p className="modal-song-title">
                "{song.title}" by {song.artistName}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {error && <div className="form-error" style={{ margin: '0 20px 12px' }}>{error}</div>}
        {successMsg && (
          <div className="form-success" style={{ margin: '0 20px 12px' }}>
            <Check size={15} /> {successMsg}
          </div>
        )}

        <div className="playlist-modal-body">
          {loading ? (
            <div className="catalog-loading" style={{ minHeight: 140 }}>
              <Disc3 size={24} className="spin" />
              <span>Loading playlists...</span>
            </div>
          ) : (
            <div className="playlist-modal-list">
              {playlists.length === 0 && !showCreate ? (
                <div className="playlist-modal-empty">
                  <p>You don't have any playlists yet.</p>
                </div>
              ) : (
                playlists.map((pl) => {
                  const isAdded = Boolean(addedMap[pl.id])
                  const isAdding = addingId === pl.id

                  return (
                    <div key={pl.id} className="playlist-modal-row">
                      <div className="playlist-modal-row-meta">
                        <div className="playlist-modal-thumb">
                          {pl.coverImage ? (
                            <img src={pl.coverImage} alt={pl.name} />
                          ) : (
                            <Disc3 size={18} />
                          )}
                        </div>
                        <div>
                          <strong>{pl.name}</strong>
                          <span>{pl.songCount} {pl.songCount === 1 ? 'track' : 'tracks'}</span>
                        </div>
                      </div>
                      <button
                        className={`button-secondary playlist-add-btn ${isAdded ? 'playlist-add-btn--done' : ''}`}
                        onClick={() => handleAdd(pl)}
                        disabled={isAdded || isAdding}
                      >
                        {isAdding ? (
                          <LoaderCircle size={14} className="spin" />
                        ) : isAdded ? (
                          <><Check size={14} /> Added</>
                        ) : (
                          <><Plus size={14} /> Add</>
                        )}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Quick Create Playlist Section */}
          {showCreate ? (
            <form className="playlist-create-form" onSubmit={handleCreateAndAdd}>
              <div className="playlist-create-header">
                <strong>New Playlist</strong>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
              </div>
              <input
                type="text"
                placeholder="Playlist name (e.g., Midnight Vibes)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={150}
                required
                autoFocus
              />
              <textarea
                placeholder="Optional description"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                maxLength={500}
                rows={2}
              />
              <button
                type="submit"
                className="button-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={creating || !newName.trim()}
              >
                {creating ? <LoaderCircle size={16} className="spin" /> : 'Create & Add Track'}
              </button>
            </form>
          ) : (
            <button
              className="playlist-new-btn"
              onClick={() => setShowCreate(true)}
              type="button"
            >
              <FolderPlus size={16} /> Create new playlist
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
