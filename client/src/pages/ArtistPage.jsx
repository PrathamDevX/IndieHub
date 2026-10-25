import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  Disc3,
  Heart,
  ListPlus,
  LoaderCircle,
  MapPin,
  MessageSquare,
  Pause,
  Play,
  UserCheck,
  UserPlus,
  UserRound,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { followArtist, getArtist, likeSong, unfollowArtist, unlikeSong } from '../services/catalogService'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import AddToPlaylistModal from '../components/playlist/AddToPlaylistModal'
import SongCommentsDrawer from '../components/comments/SongCommentsDrawer'

export default function ArtistPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { currentSong, isPlaying, playSong, playQueue, togglePlay, updateSongLikeStatus } = usePlayer()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [followLoading, setFollowLoading] = useState(false)
  const [playlistSong, setPlaylistSong] = useState(null)
  const [discussionSong, setDiscussionSong] = useState(null)

  useEffect(() => {
    getArtist(id)
      .then(setData)
      .catch(() => setError('Artist profile could not be found.'))
  }, [id])

  if (error) {
    return (
      <main className="content empty-page">
        <p>{error}</p>
        <Link className="button-secondary" to="/discover">
          Back to discover
        </Link>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="content empty-page">
        <LoaderCircle className="spin" size={25} />
        <p>Loading artist profile...</p>
      </main>
    )
  }

  const { artist, songs, albums } = data
  const isOwnProfile = user && user.id === artist.userId

  async function handleToggleFollow() {
    if (!user) {
      navigate('/login')
      return
    }
    setFollowLoading(true)
    try {
      if (artist.isFollowing) {
        const res = await unfollowArtist(artist.id)
        setData((prev) => ({
          ...prev,
          artist: {
            ...prev.artist,
            isFollowing: false,
            followerCount: res.data.followerCount,
          },
        }))
      } else {
        const res = await followArtist(artist.id)
        setData((prev) => ({
          ...prev,
          artist: {
            ...prev.artist,
            isFollowing: true,
            followerCount: res.data.followerCount,
          },
        }))
      }
    } catch (err) {
      console.error('Follow action failed:', err)
    } finally {
      setFollowLoading(false)
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
        setData((prev) => ({
          ...prev,
          songs: prev.songs.map((s) =>
            s.id === song.id ? { ...s, isLiked: false, likeCount: res.data.likeCount } : s
          ),
        }))
      } else {
        const res = await likeSong(song.id)
        updateSongLikeStatus(song.id, true, res.data.likeCount)
        setData((prev) => ({
          ...prev,
          songs: prev.songs.map((s) =>
            s.id === song.id ? { ...s, isLiked: true, likeCount: res.data.likeCount } : s
          ),
        }))
      }
    } catch (err) {
      console.error('Song like failed:', err)
    }
  }

  return (
    <main className="content artist-page">
      <Link className="back-link" to="/discover">
        <ArrowLeft size={16} /> Back to discover
      </Link>

      <section className="artist-hero">
        <div className="artist-profile-image">
          {artist.profileImage ? (
            <img src={artist.profileImage} alt={artist.artistName} />
          ) : (
            <UserRound size={48} />
          )}
        </div>
        <div className="artist-hero-info">
          <p className="eyebrow">
            {artist.verified ? (
              <span className="verified-badge-inline">
                <BadgeCheck size={14} color="#10b981" /> Verified independent artist
              </span>
            ) : (
              'Independent artist'
            )}
          </p>
          <div className="artist-title-row">
            <h1>{artist.artistName}</h1>
            {!isOwnProfile && (
              <button
                className={`artist-follow-btn ${artist.isFollowing ? 'artist-follow-btn--active' : ''}`}
                onClick={handleToggleFollow}
                disabled={followLoading}
              >
                {artist.isFollowing ? (
                  <><UserCheck size={15} /> Following</>
                ) : (
                  <><UserPlus size={15} /> Follow</>
                )}
              </button>
            )}
          </div>
          <p className="artist-meta">
            {artist.genre || 'Genre not specified'}
            {artist.location && (
              <>
                <span>·</span>
                <MapPin size={14} /> {artist.location}
              </>
            )}
          </p>
          <p className="artist-bio">
            {artist.bio || 'This artist is building something new on IndieHub.'}
          </p>
          <span className="follower-count">
            {artist.followerCount} {artist.followerCount === 1 ? 'follower' : 'followers'}
          </span>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Popular songs</p>
            <h2>From the artist</h2>
          </div>
          {songs.length > 0 && (
            <button
              className="text-button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
              onClick={() => playQueue(songs, 0)}
            >
              <Play size={14} fill="currentColor" /> Play top songs
            </button>
          )}
        </div>
        {songs.length ? (
          <div className="artist-song-list">
            {songs.map((song) => {
              const isCurrent = currentSong?.id === song.id
              return (
                <div
                  className={`artist-song-row ${isCurrent ? 'artist-song-row--active' : ''}`}
                  key={song.id}
                >
                  <div className="row-art">
                    {song.coverImage ? (
                      <img src={song.coverImage} alt={song.title} className="row-art-img" />
                    ) : (
                      <Disc3 size={19} />
                    )}
                  </div>
                  <div className="row-info">
                    <strong>{song.title}</strong>
                    <span>
                      {song.albumTitle || 'Single'} · {song.playCount} {song.playCount === 1 ? 'play' : 'plays'}
                    </span>
                  </div>
                  <div className="row-actions">
                    <button
                      className="row-heart-btn"
                      onClick={() => handleToggleSongLike(song)}
                      title={song.isLiked ? 'Unlike song' : 'Like song'}
                    >
                      <Heart
                        size={16}
                        fill={song.isLiked ? '#ec4899' : 'none'}
                        color={song.isLiked ? '#ec4899' : '#858093'}
                      />
                      {song.likeCount > 0 && <small>{song.likeCount}</small>}
                    </button>
                    <button
                      className="row-heart-btn"
                      onClick={() => {
                        if (!user) navigate('/login')
                        else setPlaylistSong(song)
                      }}
                      title="Add to playlist"
                    >
                      <ListPlus size={16} />
                    </button>
                    <button
                      className="row-heart-btn"
                      onClick={() => setDiscussionSong(song)}
                      title={`Discussion (${song.commentCount || 0})`}
                    >
                      <MessageSquare size={16} />
                      {song.commentCount > 0 && <small>{song.commentCount}</small>}
                    </button>
                    <button
                      className="row-play-btn"
                      aria-label={isCurrent && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
                      title={isCurrent && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
                      onClick={() => {
                        if (isCurrent) {
                          togglePlay()
                        } else {
                          playSong(song, songs)
                        }
                      }}
                      style={{ cursor: 'pointer', padding: 6, display: 'grid', placeItems: 'center' }}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause size={16} fill="currentColor" />
                      ) : (
                        <Play size={16} fill="currentColor" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="catalog-empty">No approved songs yet.</div>
        )}
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Discography</p>
            <h2>Albums</h2>
          </div>
        </div>
        {albums.length ? (
          <div className="album-grid">
            {albums.map((album) => (
              <div className="album-card" key={album.id}>
                <div className="album-art">
                  {album.coverImage ? (
                    <img src={album.coverImage} alt={album.title} className="album-art-img" />
                  ) : (
                    <Disc3 size={34} />
                  )}
                </div>
                <strong>{album.title}</strong>
                <span>{album.songCount || 0} songs</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="catalog-empty">No albums yet.</div>
        )}
      </section>

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
            setData((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                songs: prev.songs.map((s) => (s.id === songId ? { ...s, commentCount: count } : s)),
              }
            })
          }}
        />
      )}
    </main>
  )
}
