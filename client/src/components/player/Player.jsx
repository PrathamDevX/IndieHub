import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  Disc3,
  Heart,
  ListMusic,
  ListPlus,
  LoaderCircle,
  MessageSquare,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { usePlayer } from '../../context/PlayerContext'
import { useAuth } from '../../context/AuthContext'
import AddToPlaylistModal from '../playlist/AddToPlaylistModal'
import SongCommentsDrawer from '../comments/SongCommentsDrawer'

function formatTime(sec) {
  if (!sec || isNaN(sec) || sec < 0) return '0:00'
  const mins = Math.floor(sec / 60)
  const remaining = Math.floor(sec % 60)
  return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`
}

export default function Player() {
  const { user } = useAuth()
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    queue,
    queueIndex,
    loading,
    error,
    isShuffle,
    repeatMode,
    togglePlay,
    next,
    prev,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    toggleCurrentSongLike,
    playQueue,
  } = usePlayer()

  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubValue, setScrubValue] = useState(0)
  const [showQueue, setShowQueue] = useState(false)
  const [playlistSong, setPlaylistSong] = useState(null)
  const [discussionSong, setDiscussionSong] = useState(null)

  const activeDuration = duration || currentSong?.duration || 0
  const progressPercent = activeDuration > 0
    ? Math.min(100, Math.max(0, ((isScrubbing ? scrubValue : currentTime) / activeDuration) * 100))
    : 0

  function handleScrubChange(e) {
    setIsScrubbing(true)
    setScrubValue(parseFloat(e.target.value))
  }

  function handleScrubCommit() {
    seek(scrubValue)
    setIsScrubbing(false)
  }

  function handleVolumeChange(e) {
    setVolume(parseFloat(e.target.value))
  }

  return (
    <>
      {/* Queue Drawer / Popover */}
      {showQueue && (
        <aside className="player-queue-popover" aria-label="Playback Queue">
          <div className="player-queue-header">
            <div>
              <h3>Playback Queue</h3>
              <span>{queue.length} {queue.length === 1 ? 'song' : 'songs'} in up next</span>
            </div>
            <button className="text-button" onClick={() => setShowQueue(false)}>
              Close
            </button>
          </div>
          <div className="player-queue-list">
            {queue.length === 0 ? (
              <p className="player-queue-empty">Queue is currently empty.</p>
            ) : (
              queue.map((song, idx) => {
                const isCurrent = idx === queueIndex
                return (
                  <div
                    key={`${song.id}-${idx}`}
                    className={`player-queue-item ${isCurrent ? 'player-queue-item--active' : ''}`}
                    onClick={() => playQueue(queue, idx)}
                  >
                    <div className="player-queue-art">
                      {song.coverImage ? (
                        <img src={song.coverImage} alt={song.title} />
                      ) : (
                        <Disc3 size={16} />
                      )}
                    </div>
                    <div className="player-queue-meta">
                      <strong>{song.title}</strong>
                      <span>{song.artistName}</span>
                    </div>
                    <span className="player-queue-duration">
                      {formatTime(song.duration)}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </aside>
      )}

      {/* Persistent Audio Player Footer */}
      <footer className={`player ${currentSong ? 'player--active' : 'player--idle'}`}>
        {/* Left: Now Playing Metadata */}
        <div className="now-playing">
          {currentSong ? (
            <>
              <div className="now-playing-art">
                {currentSong.coverImage ? (
                  <img src={currentSong.coverImage} alt={currentSong.title} />
                ) : (
                  <Disc3 size={20} className={isPlaying ? 'spin-slow' : ''} />
                )}
              </div>
              <div className="now-playing-info">
                <strong title={currentSong.title}>{currentSong.title}</strong>
                {currentSong.artistId ? (
                  <Link to={`/artists/${currentSong.artistId}`} className="now-playing-artist">
                    {currentSong.artistName}
                  </Link>
                ) : (
                  <span>{currentSong.artistName}</span>
                )}
              </div>
              {user && (
                <>
                  <button
                    className={`player-heart-btn ${currentSong.isLiked ? 'player-heart-btn--active' : ''}`}
                    onClick={() => toggleCurrentSongLike(user)}
                    title={currentSong.isLiked ? 'Unlike track' : 'Like track'}
                    aria-label="Like track"
                  >
                    <Heart
                      size={18}
                      fill={currentSong.isLiked ? '#ec4899' : 'none'}
                      color={currentSong.isLiked ? '#ec4899' : '#8e879f'}
                    />
                  </button>
                  <button
                    className="player-heart-btn"
                    onClick={() => setPlaylistSong(currentSong)}
                    title="Add track to playlist"
                    aria-label="Add track to playlist"
                  >
                    <ListPlus size={18} />
                  </button>
                </>
              )}
              <button
                className={`player-heart-btn ${discussionSong ? 'player-heart-btn--active' : ''}`}
                onClick={() => setDiscussionSong(currentSong)}
                title="View comments & discussion"
                aria-label="Discussion"
              >
                <MessageSquare size={17} />
                {currentSong.commentCount > 0 && (
                  <span className="player-comment-counter">{currentSong.commentCount}</span>
                )}
              </button>
            </>
          ) : (
            <div className="now-playing-idle">
              <Disc3 size={20} color="#6c647b" />
              <span>Select a song to begin playing</span>
            </div>
          )}
        </div>

        {/* Center: Controls and Seek Bar */}
        <div className="player-center">
          <div className="player-controls">
            <button
              className={`player-sub-btn ${isShuffle ? 'player-sub-btn--active' : ''}`}
              onClick={toggleShuffle}
              title={isShuffle ? 'Shuffle on' : 'Shuffle off'}
              disabled={!currentSong}
              aria-label="Shuffle"
            >
              <Shuffle size={16} />
            </button>

            <button
              className="player-sub-btn"
              onClick={prev}
              title="Previous"
              disabled={!currentSong}
              aria-label="Previous"
            >
              <SkipBack size={18} />
            </button>

            <button
              className={`play-button ${isPlaying ? 'play-button--playing' : ''}`}
              onClick={togglePlay}
              disabled={!currentSong && queue.length === 0}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {loading ? (
                <LoaderCircle size={18} className="spin" />
              ) : isPlaying ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />
              )}
            </button>

            <button
              className="player-sub-btn"
              onClick={next}
              title="Next"
              disabled={!currentSong}
              aria-label="Next"
            >
              <SkipForward size={18} />
            </button>

            <button
              className={`player-sub-btn ${repeatMode !== 'off' ? 'player-sub-btn--active' : ''}`}
              onClick={cycleRepeat}
              title={`Repeat: ${repeatMode}`}
              disabled={!currentSong}
              aria-label="Repeat mode"
            >
              {repeatMode === 'one' ? <Repeat1 size={17} /> : <Repeat size={17} />}
            </button>
          </div>

          {/* Scrubber Progress Bar */}
          <div className="player-scrubber-row">
            <span className="player-time">{formatTime(isScrubbing ? scrubValue : currentTime)}</span>
            <div className="player-progress-container">
              <input
                type="range"
                className="player-range"
                min={0}
                max={activeDuration || 100}
                step={0.5}
                value={isScrubbing ? scrubValue : currentTime}
                onChange={handleScrubChange}
                onMouseUp={handleScrubCommit}
                onTouchEnd={handleScrubCommit}
                disabled={!currentSong}
                aria-label="Seek time"
                style={{
                  background: `linear-gradient(to right, #a78bfa ${progressPercent}%, #2e283d ${progressPercent}%)`,
                }}
              />
            </div>
            <span className="player-time">{formatTime(activeDuration)}</span>
          </div>
        </div>

        {/* Right: Audio Info, Queue, Volume */}
        <div className="player-meta">
          {error && (
            <div className="player-error" title={error}>
              <AlertCircle size={15} color="#f87171" />
              <span>Failed</span>
            </div>
          )}

          <button
            className={`player-meta-btn ${showQueue ? 'player-meta-btn--active' : ''}`}
            onClick={() => setShowQueue((prev) => !prev)}
            title="Up next queue"
            aria-label="Up next queue"
          >
            <ListMusic size={18} />
            {queue.length > 0 && <span className="queue-pill">{queue.length}</span>}
          </button>

          <div className="player-volume">
            <button
              className="player-meta-btn"
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
              aria-label="Mute toggle"
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={18} />
              ) : volume < 0.5 ? (
                <Volume1 size={18} />
              ) : (
                <Volume2 size={18} />
              )}
            </button>
            <input
              type="range"
              className="volume-slider"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              aria-label="Volume slider"
              style={{
                background: `linear-gradient(to right, #a78bfa ${(isMuted ? 0 : volume) * 100}%, #2e283d ${(isMuted ? 0 : volume) * 100}%)`,
              }}
            />
          </div>
        </div>
      </footer>

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
        />
      )}
    </>
  )
}
