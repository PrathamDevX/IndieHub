import { useEffect, useState } from 'react'
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle,
  Clock,
  Disc3,
  Headphones,
  Mic2,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  XCircle,
} from 'lucide-react'
import {
  approveSong,
  deleteSong,
  deleteUser,
  getAdminArtists,
  getAdminStats,
  getAdminUsers,
  getPendingSongs,
  rejectSong,
  updateUserStatus,
  verifyArtist,
} from '../services/adminService'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/admin/StatCard'
import AdminNav from '../components/admin/AdminNav'
import ConfirmModal from '../components/admin/ConfirmModal'

export default function AdminDashboardPage() {
  const { user: currentAdmin } = useAuth()
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [pendingSongs, setPendingSongs] = useState([])
  const [artists, setArtists] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState(null) // { type: 'success' | 'error', text: '' }

  // Search & filters
  const [artistSearch, setArtistSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')

  // Confirmation modal state
  const [modal, setModal] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    danger: false,
    action: null,
  })
  const [modalLoading, setModalLoading] = useState(false)

  // In-line audio preview
  const [previewingSongId, setPreviewingSongId] = useState(null)
  const [audioElement, setAudioElement] = useState(null)

  function showBanner(text, type = 'success') {
    setBanner({ text, type })
    setTimeout(() => setBanner(null), 4000)
  }

  async function loadData() {
    setLoading(true)
    try {
      const [statsData, songsData] = await Promise.all([
        getAdminStats(),
        getPendingSongs(),
      ])
      setStats(statsData)
      setPendingSongs(songsData)

      if (tab === 'artists' || tab === 'overview') {
        const artistsData = await getAdminArtists({ search: artistSearch })
        setArtists(artistsData)
      }
      if (tab === 'users' || tab === 'overview') {
        const usersData = await getAdminUsers({ search: userSearch, role: userRoleFilter })
        setUsers(usersData)
      }
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to load admin data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tab])

  // Reload filtered artists / users when search changes
  useEffect(() => {
    if (tab === 'artists') {
      const timer = setTimeout(() => {
        getAdminArtists({ search: artistSearch }).then(setArtists).catch(() => {})
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [artistSearch, tab])

  useEffect(() => {
    if (tab === 'users') {
      const timer = setTimeout(() => {
        getAdminUsers({ search: userSearch, role: userRoleFilter }).then(setUsers).catch(() => {})
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [userSearch, userRoleFilter, tab])

  // Clean up audio preview when switching away
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause()
      }
    }
  }, [audioElement])

  function handleAudioPreview(song) {
    if (previewingSongId === song.id) {
      audioElement?.pause()
      setPreviewingSongId(null)
      return
    }

    if (audioElement) {
      audioElement.pause()
    }

    const audio = new Audio(song.audioUrl)
    audio.play().catch(() => {})
    audio.onended = () => setPreviewingSongId(null)
    setAudioElement(audio)
    setPreviewingSongId(song.id)
  }

  // --- Song Moderation Actions ---
  async function handleApproveSong(song) {
    try {
      await approveSong(song.id)
      setPendingSongs((prev) => prev.filter((s) => s.id !== song.id))
      setStats((prev) => prev ? {
        ...prev,
        pendingSongs: Math.max(0, prev.pendingSongs - 1),
        approvedSongs: prev.approvedSongs + 1,
      } : prev)
      showBanner(`"${song.title}" approved successfully.`)
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to approve song.', 'error')
    }
  }

  function promptRejectSong(song) {
    setModal({
      open: true,
      title: 'Reject Song',
      message: `Are you sure you want to reject "${song.title}" by ${song.artistName}? It will not be published to discovery.`,
      confirmText: 'Reject Song',
      danger: true,
      action: async () => {
        setModalLoading(true)
        try {
          await rejectSong(song.id)
          setPendingSongs((prev) => prev.filter((s) => s.id !== song.id))
          setStats((prev) => prev ? {
            ...prev,
            pendingSongs: Math.max(0, prev.pendingSongs - 1),
            rejectedSongs: prev.rejectedSongs + 1,
          } : prev)
          showBanner(`"${song.title}" was rejected.`)
        } catch (err) {
          showBanner(err.response?.data?.message || 'Failed to reject song.', 'error')
        } finally {
          setModalLoading(false)
          setModal((prev) => ({ ...prev, open: false }))
        }
      },
    })
  }

  function promptDeleteSong(song) {
    setModal({
      open: true,
      title: 'Delete Song Permanently',
      message: `This will permanently delete "${song.title}" and remove its audio and cover files from storage. This action cannot be undone.`,
      confirmText: 'Delete Permanently',
      danger: true,
      action: async () => {
        setModalLoading(true)
        try {
          await deleteSong(song.id)
          setPendingSongs((prev) => prev.filter((s) => s.id !== song.id))
          setStats((prev) => prev ? {
            ...prev,
            totalSongs: Math.max(0, prev.totalSongs - 1),
            pendingSongs: Math.max(0, prev.pendingSongs - 1),
          } : prev)
          showBanner(`"${song.title}" deleted permanently.`)
        } catch (err) {
          showBanner(err.response?.data?.message || 'Failed to delete song.', 'error')
        } finally {
          setModalLoading(false)
          setModal((prev) => ({ ...prev, open: false }))
        }
      },
    })
  }

  // --- Artist Verification ---
  async function handleToggleVerify(artist) {
    const nextStatus = !artist.verified
    try {
      await verifyArtist(artist.id, nextStatus)
      setArtists((prev) =>
        prev.map((a) => (a.id === artist.id ? { ...a, verified: nextStatus ? 1 : 0 } : a))
      )
      setStats((prev) => prev ? {
        ...prev,
        verifiedArtists: prev.verifiedArtists + (nextStatus ? 1 : -1),
      } : prev)
      showBanner(`Artist "${artist.artistName}" ${nextStatus ? 'verified' : 'unverified'}.`)
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to update artist verification.', 'error')
    }
  }

  // --- User Suspension & Deletion ---
  function promptToggleUserStatus(targetUser) {
    const isSuspended = targetUser.status === 'suspended'
    const nextStatus = isSuspended ? 'active' : 'suspended'

    setModal({
      open: true,
      title: isSuspended ? 'Activate User Account' : 'Suspend User Account',
      message: isSuspended
        ? `Re-activate ${targetUser.name}'s account (${targetUser.email})? They will be able to log in again.`
        : `Are you sure you want to suspend ${targetUser.name} (${targetUser.email})? They will immediately be prevented from logging in.`,
      confirmText: isSuspended ? 'Activate Account' : 'Suspend Account',
      danger: !isSuspended,
      action: async () => {
        setModalLoading(true)
        try {
          await updateUserStatus(targetUser.id, nextStatus)
          setUsers((prev) =>
            prev.map((u) => (u.id === targetUser.id ? { ...u, status: nextStatus } : u))
          )
          showBanner(`User ${targetUser.name} is now ${nextStatus}.`)
        } catch (err) {
          showBanner(err.response?.data?.message || 'Failed to update user status.', 'error')
        } finally {
          setModalLoading(false)
          setModal((prev) => ({ ...prev, open: false }))
        }
      },
    })
  }

  function promptDeleteUser(targetUser) {
    setModal({
      open: true,
      title: 'Delete User Account',
      message: `Permanently delete account "${targetUser.name}" (${targetUser.email})? All associated artist profiles, songs, playlists, and comments will be deleted. This cannot be undone.`,
      confirmText: 'Delete Account',
      danger: true,
      action: async () => {
        setModalLoading(true)
        try {
          await deleteUser(targetUser.id)
          setUsers((prev) => prev.filter((u) => u.id !== targetUser.id))
          setStats((prev) => prev ? { ...prev, totalUsers: Math.max(0, prev.totalUsers - 1) } : prev)
          showBanner(`User ${targetUser.name} deleted successfully.`)
        } catch (err) {
          showBanner(err.response?.data?.message || 'Failed to delete user.', 'error')
        } finally {
          setModalLoading(false)
          setModal((prev) => ({ ...prev, open: false }))
        }
      },
    })
  }

  return (
    <main className="content admin-page">
      {/* Header */}
      <div className="admin-header">
        <div>
          <div className="admin-badge">
            <Shield size={14} /> Platform Administration
          </div>
          <h1>Admin Dashboard</h1>
          <p className="admin-subtitle">
            Manage music submissions, verified artist rosters, and platform users.
          </p>
        </div>
        <button className="button-secondary refresh-btn" onClick={loadData} title="Refresh dashboard data">
          <RotateCcw size={15} /> Refresh
        </button>
      </div>

      {/* Banner */}
      {banner && (
        <div className={`admin-banner admin-banner--${banner.type}`}>
          {banner.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Navigation */}
      <AdminNav
        activeTab={tab}
        onSelectTab={setTab}
        pendingCount={pendingSongs.length}
      />

      {/* ===================== TAB: OVERVIEW ===================== */}
      {tab === 'overview' && (
        <section className="admin-section">
          {stats ? (
            <div className="admin-stats-grid">
              <StatCard label="Total Users" value={stats.totalUsers} icon={Users} color="#8b5cf6" />
              <StatCard label="Total Artists" value={stats.totalArtists} icon={Mic2} color="#06b6d4" />
              <StatCard label="Verified Artists" value={stats.verifiedArtists} icon={BadgeCheck} color="#10b981" />
              <StatCard label="Total Songs" value={stats.totalSongs} icon={Music2} color="#f59e0b" />
              <StatCard
                label="Pending Review"
                value={stats.pendingSongs}
                icon={Clock}
                color="#ec4899"
                highlight={stats.pendingSongs > 0}
              />
              <StatCard label="Total Streams" value={stats.totalPlays} icon={Headphones} color="#a855f7" />
            </div>
          ) : (
            <div className="catalog-loading">Loading metrics...</div>
          )}

          {/* Quick Pending Preview in Overview */}
          <div className="admin-overview-columns">
            <div className="admin-card">
              <div className="admin-card-header">
                <div>
                  <h3>Songs Awaiting Approval</h3>
                  <span className="admin-card-subtitle">{pendingSongs.length} pending moderation</span>
                </div>
                {pendingSongs.length > 0 && (
                  <button className="text-button" onClick={() => setTab('songs')}>
                    View all <span>→</span>
                  </button>
                )}
              </div>
              {pendingSongs.length === 0 ? (
                <div className="admin-empty">
                  <CheckCircle size={28} />
                  <strong>All caught up!</strong>
                  <span>There are no songs pending approval.</span>
                </div>
              ) : (
                <div className="admin-song-preview-list">
                  {pendingSongs.slice(0, 4).map((s) => (
                    <div key={s.id} className="admin-song-row">
                      <div className="admin-song-meta">
                        <div className="admin-song-thumb">
                          {s.coverImage ? (
                            <img src={s.coverImage} alt={s.title} />
                          ) : (
                            <Disc3 size={20} />
                          )}
                        </div>
                        <div>
                          <strong>{s.title}</strong>
                          <span>{s.artistName} {s.genre ? `• ${s.genre}` : ''}</span>
                        </div>
                      </div>
                      <div className="admin-song-actions">
                        <button
                          className="admin-icon-btn preview-btn"
                          onClick={() => handleAudioPreview(s)}
                          title="Preview Audio"
                        >
                          {previewingSongId === s.id ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <button
                          className="button-primary btn-sm"
                          onClick={() => handleApproveSong(s)}
                        >
                          Approve
                        </button>
                        <button
                          className="button-secondary btn-sm"
                          onClick={() => promptRejectSong(s)}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="admin-card">
              <div className="admin-card-header">
                <div>
                  <h3>Platform Health</h3>
                  <span className="admin-card-subtitle">Active status & catalog breakdown</span>
                </div>
              </div>
              {stats && (
                <div className="admin-health-metrics">
                  <div className="health-row">
                    <span>Approved Catalog</span>
                    <strong>{stats.approvedSongs} songs</strong>
                  </div>
                  <div className="health-row">
                    <span>Rejected Submissions</span>
                    <strong>{stats.rejectedSongs} songs</strong>
                  </div>
                  <div className="health-row">
                    <span>Artist Verification Rate</span>
                    <strong>
                      {stats.totalArtists > 0
                        ? `${Math.round((stats.verifiedArtists / stats.totalArtists) * 100)}%`
                        : '0%'}
                    </strong>
                  </div>
                  <div className="health-row">
                    <span>Admin Operator</span>
                    <strong className="admin-logged-tag">{currentAdmin?.name}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===================== TAB: PENDING SONGS ===================== */}
      {tab === 'songs' && (
        <section className="admin-section">
          <div className="admin-section-header">
            <div>
              <h2>Pending Submissions</h2>
              <p>Listen to audio tracks and review details before making them public.</p>
            </div>
            <span className="pending-counter">{pendingSongs.length} tracks waiting</span>
          </div>

          {loading ? (
            <div className="catalog-loading">Loading pending songs...</div>
          ) : pendingSongs.length === 0 ? (
            <div className="admin-empty-full">
              <CheckCircle size={44} color="#10b981" />
              <h2>No songs awaiting moderation</h2>
              <p>When artists submit new music, it will appear here for your review.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Track</th>
                    <th>Artist</th>
                    <th>Genre</th>
                    <th>Submitted</th>
                    <th>Audio Preview</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSongs.map((song) => (
                    <tr key={song.id}>
                      <td>
                        <div className="admin-table-item">
                          <div className="admin-table-thumb">
                            {song.coverImage ? (
                              <img src={song.coverImage} alt={song.title} />
                            ) : (
                              <Disc3 size={18} />
                            )}
                          </div>
                          <div>
                            <strong>{song.title}</strong>
                            {song.albumTitle && <small className="table-sub">{song.albumTitle}</small>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="artist-name-cell">
                          {song.artistName}
                          {song.artistVerified ? <BadgeCheck size={14} color="#10b981" /> : null}
                        </span>
                      </td>
                      <td>
                        <span className="genre-pill">{song.genre || 'Unspecified'}</span>
                      </td>
                      <td>
                        <span className="date-cell">
                          {new Date(song.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`audio-preview-pill ${previewingSongId === song.id ? 'audio-preview-pill--active' : ''}`}
                          onClick={() => handleAudioPreview(song)}
                        >
                          {previewingSongId === song.id ? (
                            <><Pause size={13} fill="currentColor" /> Playing</>
                          ) : (
                            <><Play size={13} fill="currentColor" /> Preview</>
                          )}
                        </button>
                      </td>
                      <td className="text-right">
                        <div className="table-action-row">
                          <button
                            className="btn-approve"
                            onClick={() => handleApproveSong(song)}
                            title="Approve song"
                          >
                            <CheckCircle size={15} /> Approve
                          </button>
                          <button
                            className="btn-reject"
                            onClick={() => promptRejectSong(song)}
                            title="Reject song"
                          >
                            <XCircle size={15} /> Reject
                          </button>
                          <button
                            className="btn-delete-icon"
                            onClick={() => promptDeleteSong(song)}
                            title="Delete song"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ===================== TAB: ARTISTS ===================== */}
      {tab === 'artists' && (
        <section className="admin-section">
          <div className="admin-section-header">
            <div>
              <h2>Registered Artists</h2>
              <p>Verify artist identities to display the official verification badge.</p>
            </div>
            <div className="admin-search-input">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search artists by name or genre..."
                value={artistSearch}
                onChange={(e) => setArtistSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Artist</th>
                  <th>Genre</th>
                  <th>Location</th>
                  <th>Songs</th>
                  <th>Followers</th>
                  <th>Status</th>
                  <th className="text-right">Verification</th>
                </tr>
              </thead>
              <tbody>
                {artists.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-empty">
                      No artists match your search.
                    </td>
                  </tr>
                ) : (
                  artists.map((artist) => (
                    <tr key={artist.id}>
                      <td>
                        <div className="admin-table-item">
                          <div className="admin-avatar-small">
                            {artist.profileImage ? (
                              <img src={artist.profileImage} alt={artist.artistName} />
                            ) : (
                              artist.artistName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <strong className="artist-name-cell">
                              {artist.artistName}
                              {artist.verified ? <BadgeCheck size={14} color="#10b981" /> : null}
                            </strong>
                            <small className="table-sub">{artist.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>{artist.genre || '—'}</td>
                      <td>{artist.location || '—'}</td>
                      <td>{artist.songCount}</td>
                      <td>{artist.followerCount}</td>
                      <td>
                        <span className={`status-pill status-pill--${artist.userStatus}`}>
                          {artist.userStatus}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          className={`btn-verify-toggle ${artist.verified ? 'btn-verify-toggle--verified' : ''}`}
                          onClick={() => handleToggleVerify(artist)}
                        >
                          {artist.verified ? (
                            <><BadgeCheck size={15} /> Verified</>
                          ) : (
                            <><CheckCircle size={15} /> Verify Artist</>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ===================== TAB: USERS ===================== */}
      {tab === 'users' && (
        <section className="admin-section">
          <div className="admin-section-header">
            <div>
              <h2>User Management</h2>
              <p>Manage accounts, suspend policy violators, or remove users.</p>
            </div>
            <div className="admin-filters">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="admin-select"
              >
                <option value="">All Roles</option>
                <option value="listener">Listeners</option>
                <option value="artist">Artists</option>
                <option value="admin">Admins</option>
              </select>
              <div className="admin-search-input">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-empty">
                      No users match your criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelf = u.id === currentAdmin?.id
                    const isSuspended = u.status === 'suspended'
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="admin-table-item">
                            <div className="admin-avatar-small">
                              {u.profileImage ? (
                                <img src={u.profileImage} alt={u.name} />
                              ) : (
                                u.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <strong>{u.name} {isSelf && <span className="self-tag">(You)</span>}</strong>
                              <small className="table-sub">{u.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`role-pill role-pill--${u.role}`}>{u.role}</span>
                        </td>
                        <td>
                          <span className={`status-pill status-pill--${u.status}`}>
                            {u.status}
                          </span>
                        </td>
                        <td>
                          <span className="date-cell">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="text-right">
                          {isSelf ? (
                            <span className="table-sub">—</span>
                          ) : (
                            <div className="table-action-row">
                              <button
                                className={`btn-status-toggle ${isSuspended ? 'btn-status-toggle--activate' : 'btn-status-toggle--suspend'}`}
                                onClick={() => promptToggleUserStatus(u)}
                                title={isSuspended ? 'Re-activate account' : 'Suspend account'}
                              >
                                {isSuspended ? (
                                  <><UserCheck size={14} /> Activate</>
                                ) : (
                                  <><UserMinus size={14} /> Suspend</>
                                )}
                              </button>
                              <button
                                className="btn-delete-icon"
                                onClick={() => promptDeleteUser(u)}
                                title="Delete user"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        danger={modal.danger}
        loading={modalLoading}
        onConfirm={modal.action}
        onCancel={() => setModal((prev) => ({ ...prev, open: false }))}
      />
    </main>
  )
}
