import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeCheck,
  CheckCircle,
  Clock,
  CloudUpload,
  Disc3,
  ExternalLink,
  Headphones,
  Heart,
  Mic2,
  Music2,
  Users,
} from 'lucide-react'
import { getOwnDashboard } from '../services/artistService'
import { getArtist } from '../services/catalogService'
import { Spinner } from '../components/common/Spinner'

export default function ArtistDashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [artistDetails, setArtistDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        setLoading(true)
        const res = await getOwnDashboard()
        if (!isMounted) return
        const raw = res?.dashboard || res || {}
        setDashboard(raw)

        if (raw.id) {
          try {
            const detail = await getArtist(raw.id)
            if (isMounted && detail) {
              setArtistDetails(detail)
            }
          } catch (err) {
            console.error('Failed to load artist songs:', err)
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error(err)
          setError(err.response?.data?.message || 'Failed to load artist dashboard.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return (
      <main className="content">
        <Spinner text="Loading artist dashboard..." />
      </main>
    )
  }

  if (error) {
    return (
      <main className="content empty-page">
        <div className="form-error">{error}</div>
        <Link to="/" className="button-secondary" style={{ marginTop: 16 }}>
          Return to Home
        </Link>
      </main>
    )
  }

  const info = dashboard || {}
  const name = info.artistName || info.name || 'Artist'
  const bio = info.bio || ''
  const genre = info.genre || ''
  const location = info.location || ''
  const profileImage = info.profileImage || ''
  const verified = Boolean(info.verified)

  const songsList = artistDetails?.songs || info.mySongs || []
  const popularSongs = info.popularSongs?.length
    ? info.popularSongs
    : [...songsList].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 5)
  const albums = artistDetails?.albums || info.albums || []

  const totalSongs = Number(info.totalSongs ?? songsList.length)
  const approvedSongs = Number(info.approvedSongs ?? songsList.filter((s) => s.status === 'approved').length)
  const pendingSongs = Number(info.pendingSongs ?? songsList.filter((s) => s.status === 'pending').length)
  const totalPlays = Number(info.totalPlays ?? songsList.reduce((acc, s) => acc + (s.playCount || 0), 0))
  const totalLikes = Number(info.totalLikes ?? songsList.reduce((acc, s) => acc + (s.likeCount || 0), 0))
  const followerCount = Number(info.followerCount || 0)

  return (
    <main className="content artist-dashboard" style={{ paddingBottom: 60 }}>
      {/* Header Profile Section */}
      <section
        style={{
          background: 'linear-gradient(135deg, #1b162b, #12101d)',
          border: '1px solid #28233a',
          borderRadius: 16,
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
          marginBottom: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
              display: 'grid',
              placeItems: 'center',
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)',
            }}
          >
            {profileImage ? (
              <img src={profileImage} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 32, fontWeight: 700, color: '#fff', fontFamily: 'Space Grotesk' }}>
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="eyebrow" style={{ margin: 0 }}>Artist Hub</span>
              {verified && <BadgeCheck size={16} color="#10b981" />}
            </div>
            <h1 style={{ margin: '4px 0 6px', fontSize: 28, fontWeight: 700, color: '#f1edf9' }}>{name}</h1>
            <p style={{ margin: 0, color: '#8a829e', fontSize: 13, maxWidth: 520 }}>
              {bio || 'Welcome to your artist dashboard. Track your stream counts, manage songs, and grow your audience.'}
            </p>
            {(genre || location) && (
              <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: '#a78bfa' }}>
                {genre && <span>Genre: {genre}</span>}
                {location && <span>• Location: {location}</span>}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/upload" className="button-primary">
            <CloudUpload size={17} /> Upload song
          </Link>
          {info.id && (
            <Link to={`/artists/${info.id}`} className="button-secondary">
              <ExternalLink size={16} /> Public profile
            </Link>
          )}
        </div>
      </section>

      {/* Metrics Stat Cards */}
      <section className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: '#7c3aed22', color: '#a78bfa' }}>
            <Music2 size={20} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Songs</span>
            <span className="admin-stat-value">{totalSongs.toLocaleString()}</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: '#10b98122', color: '#34d399' }}>
            <CheckCircle size={20} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Approved</span>
            <span className="admin-stat-value">{approvedSongs.toLocaleString()}</span>
          </div>
        </div>

        <div className="admin-stat-card" style={pendingSongs > 0 ? { borderColor: '#ec489980' } : {}}>
          <div className="admin-stat-icon" style={{ background: '#ec489922', color: '#f472b6' }}>
            <Clock size={20} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Pending Review</span>
            <span className="admin-stat-value">{pendingSongs.toLocaleString()}</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: '#06b6d422', color: '#38bdf8' }}>
            <Headphones size={20} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Plays</span>
            <span className="admin-stat-value">{totalPlays.toLocaleString()}</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: '#f59e0b22', color: '#fbbf24' }}>
            <Heart size={20} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Likes</span>
            <span className="admin-stat-value">{totalLikes.toLocaleString()}</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: '#8b5cf622', color: '#c4b5fd' }}>
            <Users size={20} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Followers</span>
            <span className="admin-stat-value">{followerCount.toLocaleString()}</span>
          </div>
        </div>
      </section>

      {/* Popular Songs Spotlight */}
      {popularSongs.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Top Performing</p>
              <h2 style={{ margin: '4px 0 0', fontSize: 18, color: '#ede9fe' }}>Popular Songs</h2>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {popularSongs.map((song) => (
              <div
                key={song.id}
                style={{
                  background: '#14121e',
                  border: '1px solid #28233a',
                  borderRadius: 10,
                  padding: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    background: song.coverImage
                      ? `url(${song.coverImage}) center/cover`
                      : 'linear-gradient(135deg, #7c3aed, #312e81)',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {!song.coverImage && <Disc3 size={20} color="#a78bfa" />}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong
                    style={{
                      display: 'block',
                      fontSize: 13,
                      color: '#eeeafa',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {song.title}
                  </strong>
                  <span style={{ fontSize: 11, color: '#858093' }}>
                    {(song.playCount || 0).toLocaleString()} plays • {(song.likeCount || 0).toLocaleString()} likes
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* My Songs Table */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>Discography</p>
            <h2 style={{ margin: '4px 0 0', fontSize: 18, color: '#ede9fe' }}>My Songs</h2>
          </div>
          <Link to="/upload" className="button-secondary" style={{ padding: '6px 14px', fontSize: 12 }}>
            + Upload new track
          </Link>
        </div>

        {songsList.length === 0 ? (
          <div className="admin-empty-full">
            <Mic2 size={36} color="#7c3aed" />
            <h2>No songs uploaded yet</h2>
            <p>Upload your first song to start sharing your music with IndieHub listeners.</p>
            <Link to="/upload" className="button-primary" style={{ marginTop: 12 }}>
              <CloudUpload size={16} /> Upload your first song
            </Link>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Song</th>
                  <th>Album</th>
                  <th>Plays</th>
                  <th>Likes</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {songsList.map((song) => {
                  const status = song.status || 'approved'
                  const isPending = status === 'pending'
                  const isApproved = status === 'approved'

                  return (
                    <tr key={song.id}>
                      <td>
                        <div className="admin-table-item">
                          <div
                            className="admin-table-thumb"
                            style={{
                              background: song.coverImage
                                ? `url(${song.coverImage}) center/cover`
                                : 'linear-gradient(135deg, #7c3aed, #312e81)',
                            }}
                          >
                            {!song.coverImage && <Disc3 size={18} color="#c4b5fd" />}
                          </div>
                          <div>
                            <strong style={{ color: '#f1edf9', fontSize: 13 }}>{song.title}</strong>
                            <span style={{ color: '#81798f', fontSize: 11, display: 'block' }}>
                              {song.genre || 'Independent'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>{song.albumTitle || song.albumName || '—'}</td>
                      <td>{(song.playCount || 0).toLocaleString()}</td>
                      <td>{(song.likeCount || 0).toLocaleString()}</td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 12,
                            background: isApproved
                              ? '#10b98122'
                              : isPending
                              ? '#f59e0b22'
                              : '#ef444422',
                            color: isApproved
                              ? '#34d399'
                              : isPending
                              ? '#fbbf24'
                              : '#f87171',
                            border: `1px solid ${
                              isApproved
                                ? '#10b98144'
                                : isPending
                                ? '#f59e0b44'
                                : '#ef444444'
                            }`,
                          }}
                        >
                          {isApproved ? <CheckCircle size={12} /> : <Clock size={12} />}
                          {status.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-right">
                        {info.id && (
                          <Link
                            to={`/artists/${info.id}`}
                            className="text-button"
                            style={{ fontSize: 12, color: '#a78bfa' }}
                          >
                            View
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Albums section if present */}
      {albums.length > 0 && (
        <section>
          <p className="eyebrow" style={{ margin: 0 }}>Releases</p>
          <h2 style={{ margin: '4px 0 14px', fontSize: 18, color: '#ede9fe' }}>Albums & EPs</h2>
          <div className="album-grid">
            {albums.map((album) => (
              <div key={album.id} className="album-card">
                <div
                  className="album-art"
                  style={{
                    background: album.coverImage
                      ? `url(${album.coverImage}) center/cover`
                      : 'linear-gradient(135deg, #7c3aed, #312e81)',
                  }}
                >
                  {!album.coverImage && <Disc3 size={32} />}
                </div>
                <strong>{album.title}</strong>
                <span>{album.releaseDate ? new Date(album.releaseDate).getFullYear() : 'Release'}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
