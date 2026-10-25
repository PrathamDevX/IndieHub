import { useEffect, useState } from 'react'
import { BadgeCheck, Disc3, Heart, ListPlus, LoaderCircle, MessageSquare, Pause, Play, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { getArtists, getSongs, likeSong, unlikeSong } from '../services/catalogService'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import AddToPlaylistModal from '../components/playlist/AddToPlaylistModal'
import SongCommentsDrawer from '../components/comments/SongCommentsDrawer'

function CatalogCard({ song, onToggleLike, onPlay, onAddToPlaylist, onOpenDiscussion, isPlaying, isCurrent }) {
  return (
    <article className={`song-card catalog-card ${isCurrent ? 'catalog-card--active' : ''}`}>
      <div
        className="cover"
        style={{
          background: song.coverImage
            ? `url(${song.coverImage}) center/cover`
            : 'linear-gradient(135deg, #7c3aed, #312e81)',
        }}
        onClick={() => onPlay(song)}
      >
        {!song.coverImage && <Disc3 size={42} />}
        <button
          className={`card-heart-btn ${song.isLiked ? 'card-heart-btn--active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleLike(song)
          }}
          title={song.isLiked ? 'Unlike song' : 'Like song'}
        >
          <Heart
            size={16}
            fill={song.isLiked ? '#ec4899' : 'none'}
            color={song.isLiked ? '#ec4899' : 'white'}
          />
        </button>
        <button
          className="card-heart-btn"
          style={{ right: 38 }}
          onClick={(e) => {
            e.stopPropagation()
            onAddToPlaylist(song)
          }}
          title="Add to playlist"
        >
          <ListPlus size={16} color="white" />
        </button>
        <button
          className="card-heart-btn"
          style={{ right: 70 }}
          onClick={(e) => {
            e.stopPropagation()
            onOpenDiscussion(song)
          }}
          title={`Discussion (${song.commentCount || 0})`}
        >
          <MessageSquare size={15} color="white" />
        </button>
        <button
          className={`cover-play ${isCurrent && isPlaying ? 'cover-play--active' : ''}`}
          aria-label={isCurrent && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
          onClick={(e) => {
            e.stopPropagation()
            onPlay(song)
          }}
        >
          {isCurrent && isPlaying ? (
            <Pause size={17} fill="currentColor" />
          ) : (
            <Play size={17} fill="currentColor" />
          )}
        </button>
      </div>
      <strong>{song.title}</strong>
      <span>{song.artistName}{song.genre ? ` · ${song.genre}` : ''}</span>
    </article>
  )
}

export default function DiscoverPage() {
  const { user } = useAuth()
  const { currentSong, isPlaying, playSong, togglePlay, updateSongLikeStatus } = usePlayer()
  const navigate = useNavigate()
  const [songs, setSongs] = useState([])
  const [artists, setArtists] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [playlistSong, setPlaylistSong] = useState(null)
  const [discussionSong, setDiscussionSong] = useState(null)

  function handleAddToPlaylist(targetSong) {
    if (!user) {
      navigate('/login')
      return
    }
    setPlaylistSong(targetSong)
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([getSongs({ search }), getArtists({ search })])
      .then(([nextSongs, nextArtists]) => {
        if (active) {
          setSongs(nextSongs)
          setArtists(nextArtists)
          setError('')
        }
      })
      .catch(() => active && setError('We could not load the catalog. Please try again.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [search])

  async function handleToggleLike(song) {
    if (!user) {
      navigate('/login')
      return
    }
    try {
      if (song.isLiked) {
        const res = await unlikeSong(song.id)
        updateSongLikeStatus(song.id, false, res.data.likeCount)
        setSongs((prev) =>
          prev.map((s) => (s.id === song.id ? { ...s, isLiked: false, likeCount: res.data.likeCount } : s))
        )
      } else {
        const res = await likeSong(song.id)
        updateSongLikeStatus(song.id, true, res.data.likeCount)
        setSongs((prev) =>
          prev.map((s) => (s.id === song.id ? { ...s, isLiked: true, likeCount: res.data.likeCount } : s))
        )
      }
    } catch (err) {
      console.error('Like toggle failed:', err)
    }
  }

  function handlePlaySong(targetSong) {
    if (currentSong?.id === targetSong.id) {
      togglePlay()
    } else {
      playSong(targetSong, songs)
    }
  }

  return (
    <main className="content discover-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">The IndieHub catalog</p>
          <h1>Find your next sound.</h1>
        </div>
      </div>
      <div className="catalog-search">
        <Search size={18} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search songs, artists, or genres..."
        />
      </div>
      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <div className="catalog-loading">
          <LoaderCircle className="spin" size={24} /> Loading fresh sounds...
        </div>
      ) : (
        <>
          <section className="section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Approved releases</p>
                <h2>Songs for curious ears</h2>
              </div>
            </div>
            {songs.length ? (
              <div className="song-grid">
                {songs.map((song) => (
                  <CatalogCard
                    song={song}
                    key={song.id}
                    onToggleLike={handleToggleLike}
                    onPlay={handlePlaySong}
                    onAddToPlaylist={handleAddToPlaylist}
                    onOpenDiscussion={setDiscussionSong}
                    isCurrent={currentSong?.id === song.id}
                    isPlaying={isPlaying}
                  />
                ))}
              </div>
            ) : (
              <div className="catalog-empty">
                No songs found yet. Artists will appear here after their music is approved.
              </div>
            )}
          </section>

          <section className="section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Independent voices</p>
                <h2>Artists to watch</h2>
              </div>
            </div>
            {artists.length ? (
              <div className="artist-grid">
                {artists.map((artist) => (
                  <Link className="artist-card" to={`/artists/${artist.id}`} key={artist.id}>
                    <div className="artist-avatar">
                      {artist.profileImage ? (
                        <img src={artist.profileImage} alt={artist.artistName} />
                      ) : (
                        artist.artistName.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <strong className="artist-card-name">
                      {artist.artistName}
                      {artist.verified ? <BadgeCheck size={14} color="#10b981" /> : null}
                    </strong>
                    <span>{artist.genre || 'Independent artist'}</span>
                    <small className="artist-card-followers">{artist.followerCount || 0} followers</small>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="catalog-empty">No artists match your search.</div>
            )}
          </section>
        </>
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
          onCommentCountChange={(songId, count) => {
            setSongs((prev) =>
              prev.map((s) => (s.id === songId ? { ...s, commentCount: count } : s))
            )
          }}
        />
      )}
    </main>
  )
}
