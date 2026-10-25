import { Link, NavLink, Route, Routes } from 'react-router-dom'
import {
  CloudUpload,
  Disc3,
  Compass,
  Heart,
  Home,
  Library,
  ListMusic,
  Menu,
  Mic2,
  Pause,
  Play,
  Search,
  Shield,
  Sparkles,
  UserCheck,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import { usePlayer } from './context/PlayerContext'
import Player from './components/player/Player'
import AuthPage from './pages/AuthPage'
import ProtectedRoute from './routes/ProtectedRoute'
import DiscoverPage from './pages/DiscoverPage'
import ArtistPage from './pages/ArtistPage'
import UploadSongPage from './pages/UploadSongPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import LikedSongsPage from './pages/LikedSongsPage'
import FollowedArtistsPage from './pages/FollowedArtistsPage'
import LibraryPage from './pages/LibraryPage'
import ArtistDashboardPage from './pages/ArtistDashboardPage'
import PlaylistPage from './pages/PlaylistPage'
import { getLikedSongs, getSongs } from './services/catalogService'
import { getMyPlaylists } from './services/playlistService'
import './App.css'

const featuredSongs = [
  { title: 'Midnight Signals', artist: 'Nova Lane', color: 'linear-gradient(135deg, #7c3aed, #312e81)' },
  { title: 'Golden Hour', artist: 'Milo Rivers', color: 'linear-gradient(135deg, #f59e0b, #9a3412)' },
  { title: 'Coastal Dreams', artist: 'The Paper Moons', color: 'linear-gradient(135deg, #0891b2, #164e63)' },
  { title: 'Static Hearts', artist: 'Velvet Arcade', color: 'linear-gradient(135deg, #db2777, #581c87)' },
]

function Sidebar({ open, onClose }) {
  const { user } = useAuth()
  const [sidebarPlaylists, setSidebarPlaylists] = useState([])

  useEffect(() => {
    if (user) {
      getMyPlaylists()
        .then((data) => setSidebarPlaylists(data.slice(0, 6)))
        .catch(() => {})
    } else {
      setSidebarPlaylists([])
    }
  }, [user])

  const links = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/discover', label: 'Discover', icon: Compass },
    { to: '/liked', label: 'Liked Songs', icon: Heart },
    { to: '/followed', label: 'Followed Artists', icon: UserCheck },
    { to: '/library', label: 'Your Library', icon: Library },
  ]

  return (
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand">
        <div className="brand-mark"><Disc3 size={22} /></div>
        <span>Indie<span>Hub</span></span>
        <button className="mobile-close" onClick={onClose} aria-label="Close menu"><X size={20} /></button>
      </div>
      <nav className="nav-links">
        <p className="nav-label">Explore</p>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onClose}>
            <Icon size={19} /> {label}
          </NavLink>
        ))}

        {user && sidebarPlaylists.length > 0 && (
          <div className="sidebar-playlists-section">
            <p className="nav-label" style={{ marginTop: 18 }}>Your Playlists</p>
            {sidebarPlaylists.map((pl) => (
              <NavLink
                key={pl.id}
                to={`/playlists/${pl.id}`}
                onClick={onClose}
                className="sidebar-playlist-link"
              >
                <ListMusic size={16} />
                <span>{pl.name}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>
      <div className="sidebar-promo">
        <Sparkles size={20} />
        <strong>Support independent music</strong>
        <span>Every play helps an artist grow.</span>
      </div>
      <div className="sidebar-footer">
        {user?.role === 'admin' && (
          <NavLink to="/admin"><Shield size={18} /> Admin panel</NavLink>
        )}
        <NavLink to="/upload"><CloudUpload size={18} /> Upload song</NavLink>
        <NavLink to="/artist"><Mic2 size={18} /> Artist dashboard</NavLink>
        <NavLink to="/profile"><UserRound size={18} /> Profile</NavLink>
      </div>
    </aside>
  )
}

function SongCard({ song }) {
  return (
    <article className="song-card">
      <div className="cover" style={{ background: song.color }}>
        <Disc3 size={42} />
      </div>
      <strong>{song.title}</strong>
      <span>{song.artist}</span>
    </article>
  )
}

function HomePage() {
  const { user } = useAuth()
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer()
  const [myLikes, setMyLikes] = useState([])
  const [trendingSongs, setTrendingSongs] = useState([])

  useEffect(() => {
    if (user) {
      getLikedSongs().then(setMyLikes).catch(() => {})
    } else {
      setMyLikes([])
    }
  }, [user])

  useEffect(() => {
    getSongs()
      .then((songs) => {
        if (songs && songs.length > 0) {
          setTrendingSongs(songs.slice(0, 8))
        }
      })
      .catch(() => {})
  }, [])

  return (
    <main className="content">
      <section className="hero">
        <div className="hero-glow" />
        <p className="eyebrow"><Sparkles size={15} /> Fresh sounds, real stories</p>
        <h1>Discover the artists<br /><em>before they become famous.</em></h1>
        <p className="hero-copy">Explore fresh music from independent artists around the world.</p>
        <div className="hero-actions">
          <Link className="button-primary" to="/discover">
            Explore music <Play size={17} fill="currentColor" />
          </Link>
          {user ? (
            <span className="welcome-note">Welcome back, {user.name.split(' ')[0]}.</span>
          ) : (
            <Link className="button-secondary" to="/register">
              Join IndieHub
            </Link>
          )}
        </div>
        <div className="hero-stat">
          <strong>12,480+</strong>
          <span>independent artists finding their audience</span>
        </div>
      </section>

      {/* Personalized Section for Logged-In Users */}
      {user && myLikes.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Your collection</p>
              <h2>Jump back into your favorites</h2>
            </div>
            <Link to="/liked" className="text-button">
              View all ({myLikes.length}) <span>→</span>
            </Link>
          </div>
          <div className="song-grid">
            {myLikes.slice(0, 4).map((s) => {
              const isCurrent = currentSong?.id === s.id
              return (
                <article className="song-card" key={s.id}>
                  <div
                    className="cover"
                    style={{
                      background: s.coverImage ? `url(${s.coverImage}) center/cover` : 'linear-gradient(135deg, #ec4899, #7c3aed)',
                    }}
                  >
                    {!s.coverImage && <Disc3 size={42} />}
                    <button
                      className={`cover-play ${isCurrent && isPlaying ? 'cover-play--active' : ''}`}
                      aria-label={isCurrent && isPlaying ? `Pause ${s.title}` : `Play ${s.title}`}
                      onClick={() => {
                        if (isCurrent) {
                          togglePlay()
                        } else {
                          playSong(s, myLikes)
                        }
                      }}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause size={17} fill="currentColor" />
                      ) : (
                        <Play size={17} fill="currentColor" />
                      )}
                    </button>
                  </div>
                  <strong>{s.title}</strong>
                  <span>{s.artistName}</span>
                </article>
              )
            })}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">For your ears</p>
            <h2>Trending right now</h2>
          </div>
          <Link to="/discover" className="text-button">
            View all <span>→</span>
          </Link>
        </div>
        <div className="song-grid">
          {trendingSongs.length > 0
            ? trendingSongs.map((song) => {
                const isCurrent = currentSong?.id === song.id
                return (
                  <article className="song-card" key={song.id}>
                    <div
                      className="cover"
                      style={{
                        background: song.coverImage
                          ? `url(${song.coverImage}) center/cover`
                          : 'linear-gradient(135deg, #7c3aed, #312e81)',
                      }}
                    >
                      {!song.coverImage && <Disc3 size={42} />}
                      <button
                        className={`cover-play ${isCurrent && isPlaying ? 'cover-play--active' : ''}`}
                        aria-label={isCurrent && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
                        onClick={() => {
                          if (isCurrent) {
                            togglePlay()
                          } else {
                            playSong(song, trendingSongs)
                          }
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
                    <span>{song.artistName}</span>
                  </article>
                )
              })
            : featuredSongs.map((song) => <SongCard song={song} key={song.title} />)}
        </div>
      </section>

      <section className="section split-section">
        <div className="feature-panel">
          <p className="eyebrow">Artist spotlight</p>
          <h2>Meet the voices<br />shaping tomorrow.</h2>
          <p>Go behind the music and find the next artist you can't stop talking about.</p>
          <Link to="/discover" className="button-secondary">Browse artists →</Link>
        </div>
        <div className="genre-panel">
          <p className="eyebrow">Find your sound</p>
          <h2>Browse by mood</h2>
          <div className="genre-list"><span>Dream pop</span><span>Lo-fi</span><span>Alt rock</span><span>Neo soul</span></div>
        </div>
      </section>
    </main>
  )
}

function PlaceholderPage({ title, description }) {
  return <main className="content empty-page"><Sparkles size={34} /><p className="eyebrow">Coming in Phase 2</p><h1>{title}</h1><p>{description}</p></main>
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  return (
    <div className="app-shell">
      <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
      <div className={`mobile-overlay ${menuOpen ? 'visible' : ''}`} onClick={() => setMenuOpen(false)} />
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="main-column">
        <header className="topbar">
          <div className="search-box"><Search size={18} /><input placeholder="Search songs, artists, albums..." /><kbd>⌘ K</kbd></div>
          <div className="top-actions"><button className="icon-button"><ListMusic size={19} /></button>{user ? <button className="avatar" onClick={logout} title="Sign out">{user.name.slice(0, 2).toUpperCase()}</button> : <Link className="top-login" to="/login">Sign in</Link>}</div>
        </header>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/liked" element={<LikedSongsPage />} />
            <Route path="/followed" element={<FollowedArtistsPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/upload" element={<UploadSongPage />} />
            <Route path="/artist" element={<ArtistDashboardPage />} />
            <Route path="/profile" element={<PlaceholderPage title="Your profile" description="Tell the IndieHub community a little about yourself." />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
          </Route>
          <Route path="/" element={<HomePage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/artists/:id" element={<ArtistPage />} />
          <Route path="/playlists/:id" element={<PlaylistPage />} />
        </Routes>
        <Player />
      </div>
    </div>
  )
}

export default App

