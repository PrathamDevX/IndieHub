import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  Disc3,
  Edit2,
  LoaderCircle,
  MessageSquare,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import {
  createSongComment,
  deleteComment,
  getSongComments,
  updateComment,
} from '../../services/commentService'
import { useAuth } from '../../context/AuthContext'

function timeAgo(dateStr) {
  if (!dateStr) return 'recently'
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function SongCommentsDrawer({ song, onClose, onCommentCountChange }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Editing state
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Deleting state
  const [deletingId, setDeletingId] = useState(null)

  const textareaRef = useRef(null)

  useEffect(() => {
    if (song?.id) {
      loadComments()
    }
  }, [song?.id])

  async function loadComments() {
    setLoading(true)
    setError('')
    try {
      const data = await getSongComments(song.id)
      setComments(data)
      if (onCommentCountChange) {
        onCommentCountChange(song.id, data.length)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load comments.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitComment(e) {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const newComment = await createSongComment(song.id, commentText.trim())
      setComments((prev) => [newComment, ...prev])
      setCommentText('')
      if (onCommentCountChange) {
        onCommentCountChange(song.id, comments.length + 1)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not post comment.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStartEdit(c) {
    setEditingId(c.id)
    setEditText(c.comment)
  }

  async function handleSaveEdit(commentId) {
    if (!editText.trim()) return
    setSavingEdit(true)
    try {
      const updated = await updateComment(commentId, editText.trim())
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, comment: updated.comment, updatedAt: updated.updatedAt } : c))
      )
      setEditingId(null)
      setEditText('')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update comment.')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDeleteComment(commentId) {
    setDeletingId(commentId)
    try {
      await deleteComment(commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      if (onCommentCountChange) {
        onCommentCountChange(song.id, Math.max(0, comments.length - 1))
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete comment.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <aside className="comments-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="comments-drawer-header">
          <div className="comments-drawer-track">
            <div className="comments-drawer-thumb">
              {song.coverImage ? (
                <img src={song.coverImage} alt={song.title} />
              ) : (
                <Disc3 size={20} color="#c4b5fd" />
              )}
            </div>
            <div className="comments-drawer-meta">
              <strong>{song.title}</strong>
              <span>{song.artistName}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close comments">
            <X size={18} />
          </button>
        </div>

        {/* Discussion Subtitle */}
        <div className="comments-drawer-bar">
          <div className="comments-drawer-title">
            <MessageSquare size={16} color="#a78bfa" />
            <span>Discussion ({comments.length})</span>
          </div>
          <small className="comments-drawer-hint">Share feedback with the artist</small>
        </div>

        {error && <div className="form-error" style={{ margin: '12px 18px 0' }}>{error}</div>}

        {/* Post Comment Input */}
        <div className="comments-drawer-composer">
          {user ? (
            <form onSubmit={handleSubmitComment}>
              <div className="composer-input-row">
                <textarea
                  ref={textareaRef}
                  placeholder={`What do you think of "${song.title}"?`}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  required
                />
              </div>
              <div className="composer-footer">
                <span className="char-count">{commentText.length}/1000</span>
                <button
                  type="submit"
                  className="button-primary composer-submit-btn"
                  disabled={submitting || !commentText.trim()}
                >
                  {submitting ? (
                    <LoaderCircle size={15} className="spin" />
                  ) : (
                    <>
                      <Send size={14} /> Post
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="composer-login-prompt">
              <Sparkles size={16} color="#a78bfa" />
              <p>Sign in to leave a comment and support this artist.</p>
              <Link to="/login" className="button-secondary" style={{ marginTop: 8 }}>
                Sign in to comment
              </Link>
            </div>
          )}
        </div>

        {/* Comments Feed */}
        <div className="comments-drawer-feed">
          {loading ? (
            <div className="catalog-loading" style={{ minHeight: 180 }}>
              <Disc3 size={24} className="spin" />
              <span>Loading conversation...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="comments-empty">
              <MessageSquare size={36} color="#655d78" />
              <p>No comments yet on this track.</p>
              <small>Be the first to share your thoughts!</small>
            </div>
          ) : (
            comments.map((c) => {
              const isEditing = editingId === c.id
              const isDeleting = deletingId === c.id

              return (
                <article key={c.id} className="comment-bubble">
                  <div className="comment-avatar">
                    {c.userAvatar ? (
                      <img src={c.userAvatar} alt={c.userName} />
                    ) : (
                      c.userName.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="comment-content">
                    <div className="comment-meta-row">
                      <div className="comment-user-info">
                        <strong>{c.userName}</strong>
                        {c.userRole === 'artist' && (
                          <span className="comment-badge comment-badge--artist">Artist</span>
                        )}
                        {c.userRole === 'admin' && (
                          <span className="comment-badge comment-badge--admin">Admin</span>
                        )}
                      </div>
                      <div className="comment-actions-row">
                        <span className="comment-time">{timeAgo(c.createdAt)}</span>
                        {c.isAuthor && (
                          <>
                            <button
                              className="comment-tool-btn"
                              onClick={() => handleStartEdit(c)}
                              title="Edit comment"
                              disabled={isDeleting}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              className="comment-tool-btn comment-tool-btn--danger"
                              onClick={() => handleDeleteComment(c.id)}
                              title="Delete comment"
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <LoaderCircle size={13} className="spin" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="comment-edit-box">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          maxLength={1000}
                          rows={2}
                          autoFocus
                        />
                        <div className="comment-edit-actions">
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="button-primary composer-submit-btn"
                            onClick={() => handleSaveEdit(c.id)}
                            disabled={savingEdit || !editText.trim()}
                          >
                            {savingEdit ? <LoaderCircle size={13} className="spin" /> : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="comment-text">{c.comment}</p>
                    )}
                  </div>
                </article>
              )
            })
          )}
        </div>
      </aside>
    </div>
  )
}
