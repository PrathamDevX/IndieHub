import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Disc3, Mic2, Sparkles, UserCheck, UserMinus } from 'lucide-react'
import { getFollowedArtists, unfollowArtist } from '../services/catalogService'

export default function FollowedArtistsPage() {
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadArtists()
  }, [])

  async function loadArtists() {
    setLoading(true)
    setError('')
    try {
      const data = await getFollowedArtists()
      setArtists(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load followed artists.')
    } finally {
      setLoading(false)
    }
  }

  async function handleUnfollow(artistId) {
    try {
      await unfollowArtist(artistId)
      setArtists((prev) => prev.filter((a) => a.id !== artistId))
    } catch (err) {
      console.error('Failed to unfollow artist:', err)
    }
  }

  return (
    <main className="content followed-artists-page">
      <Link className="back-link" to="/discover">
        <ArrowLeft size={16} /> Back to discover
      </Link>

      <div className="page-heading">
        <div>
          <p className="eyebrow"><Sparkles size={14} /> Community</p>
          <h1>Followed Artists</h1>
          <p className="upload-subtitle">Stay tuned with the creators you follow on IndieHub.</p>
        </div>
      </div>

      {loading ? (
        <div className="catalog-loading">
          <Disc3 size={24} className="spin" />
          <span>Loading followed artists...</span>
        </div>
      ) : error ? (
        <div className="form-error">{error}</div>
      ) : artists.length === 0 ? (
        <div className="admin-empty-full">
          <Mic2 size={48} color="#8b5cf6" />
          <h2>You're not following any artists yet</h2>
          <p>Follow independent artists to keep up with their latest releases and news.</p>
          <Link to="/discover" className="button-primary" style={{ marginTop: 12 }}>
            Browse artists
          </Link>
        </div>
      ) : (
        <div className="followed-artists-grid">
          {artists.map((artist) => (
            <div key={artist.id} className="followed-artist-card">
              <Link to={`/artists/${artist.id}`} className="followed-artist-avatar-wrap">
                {artist.profileImage ? (
                  <img src={artist.profileImage} alt={artist.artistName} className="followed-artist-img" />
                ) : (
                  <div className="artist-avatar">{artist.artistName.charAt(0).toUpperCase()}</div>
                )}
              </Link>

              <div className="followed-artist-info">
                <Link to={`/artists/${artist.id}`} className="followed-artist-name">
                  <strong>{artist.artistName}</strong>
                  {artist.verified ? <BadgeCheck size={15} color="#10b981" /> : null}
                </Link>
                <span className="followed-artist-genre">{artist.genre || 'Independent Artist'}</span>
                <span className="followed-artist-stats">
                  {artist.followerCount} {artist.followerCount === 1 ? 'follower' : 'followers'} • {artist.songCount} {artist.songCount === 1 ? 'song' : 'songs'}
                </span>
              </div>

              <button
                className="btn-status-toggle btn-status-toggle--suspend"
                onClick={() => handleUnfollow(artist.id)}
                title="Unfollow artist"
              >
                <UserMinus size={14} /> Unfollow
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
