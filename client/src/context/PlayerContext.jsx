import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { incrementPlayCount, likeSong as apiLikeSong, unlikeSong as apiUnlikeSong } from '../services/catalogService'

const PlayerContext = createContext(null)

export function PlayerProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [queue, setQueue] = useState([])
  const [queueIndex, setQueueIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isShuffle, setIsShuffle] = useState(false)
  const [repeatMode, setRepeatMode] = useState('off') // 'off' | 'all' | 'one'

  const audioRef = useRef(null)
  const hasTrackedPlayRef = useRef(false)
  const currentSongRef = useRef(null)
  const queueRef = useRef([])
  const queueIndexRef = useRef(-1)
  const repeatModeRef = useRef('off')
  const isShuffleRef = useRef(false)

  // Keep refs in sync for audio event callbacks
  useEffect(() => {
    currentSongRef.current = currentSong
  }, [currentSong])

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  useEffect(() => {
    queueIndexRef.current = queueIndex
  }, [queueIndex])

  useEffect(() => {
    repeatModeRef.current = repeatMode
  }, [repeatMode])

  useEffect(() => {
    isShuffleRef.current = isShuffle
  }, [isShuffle])

  // Normalize song object
  const normalizeSong = (song) => {
    if (!song) return null
    return {
      ...song,
      id: song.id,
      title: song.title || 'Untitled Track',
      artistId: song.artistId || song.artist_id,
      artistName: song.artistName || song.artist_name || 'Independent Artist',
      audioUrl: song.audioUrl || song.audio_url || '',
      coverImage: song.coverImage || song.cover_image || null,
      duration: Number(song.duration) || 0,
      isLiked: Boolean(song.isLiked),
      likeCount: Number(song.likeCount || 0),
    }
  }

  // Helper to load and play a song
  const loadAndPlay = useCallback(async (song) => {
    if (!audioRef.current || !song) return
    const audio = audioRef.current
    const norm = normalizeSong(song)

    setCurrentSong(norm)
    hasTrackedPlayRef.current = false
    setError(null)
    setLoading(true)

    audio.src = norm.audioUrl
    audio.currentTime = 0
    setCurrentTime(0)

    try {
      await audio.play()
      setIsPlaying(true)
    } catch (err) {
      // Auto-play was prevented or file error
      console.warn('Playback error or auto-play prevented:', err)
      if (err.name !== 'AbortError') {
        setError('Playback failed. The audio file could not be played.')
      }
      setIsPlaying(false)
    } finally {
      setLoading(false)
    }
  }, [])

  // Play next track
  const next = useCallback(() => {
    const q = queueRef.current
    const idx = queueIndexRef.current
    const repeat = repeatModeRef.current
    const shuffle = isShuffleRef.current

    if (repeat === 'one' && currentSongRef.current) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(() => {})
        setIsPlaying(true)
      }
      return
    }

    if (!q || q.length === 0) return

    if (shuffle && q.length > 1) {
      let randIdx = Math.floor(Math.random() * q.length)
      if (randIdx === idx) {
        randIdx = (randIdx + 1) % q.length
      }
      setQueueIndex(randIdx)
      loadAndPlay(q[randIdx])
      return
    }

    if (idx < q.length - 1) {
      const nextIdx = idx + 1
      setQueueIndex(nextIdx)
      loadAndPlay(q[nextIdx])
    } else if (repeat === 'all' && q.length > 0) {
      setQueueIndex(0)
      loadAndPlay(q[0])
    } else {
      // End of queue
      setIsPlaying(false)
    }
  }, [loadAndPlay])

  // Play previous track
  const prev = useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      setCurrentTime(0)
      return
    }

    const q = queueRef.current
    const idx = queueIndexRef.current

    if (idx > 0 && q[idx - 1]) {
      const prevIdx = idx - 1
      setQueueIndex(prevIdx)
      loadAndPlay(q[prevIdx])
    } else if (audio) {
      audio.currentTime = 0
      setCurrentTime(0)
    }
  }, [loadAndPlay])

  // Initialize single HTML5 Audio instance
  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio
    audio.volume = volume

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration)
      }
    }

    const handleDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration)
      }
    }

    const handleWaiting = () => {
      setLoading(true)
    }

    const handlePlaying = () => {
      setLoading(false)
      setIsPlaying(true)
      setError(null)

      // Increment play count once per track playback
      if (!hasTrackedPlayRef.current && currentSongRef.current?.id) {
        hasTrackedPlayRef.current = true
        incrementPlayCount(currentSongRef.current.id).catch((err) => {
          console.warn('Failed to increment play count:', err)
        })
      }
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    const handleEnded = () => {
      next()
    }

    const handleError = () => {
      setLoading(false)
      setIsPlaying(false)
      if (audio.src) {
        setError('Audio could not be loaded.')
      }
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('playing', handlePlaying)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('playing', handlePlaying)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [next])

  // Play a single song (optionally with a new queue)
  const playSong = useCallback(
    (song, newQueue = []) => {
      if (!song) return
      const norm = normalizeSong(song)

      let targetQueue = newQueue.length > 0 ? newQueue.map(normalizeSong) : queueRef.current
      let targetIdx = targetQueue.findIndex((s) => s.id === norm.id)

      if (targetIdx === -1) {
        // If not in queue, prepend or replace queue with this song
        targetQueue = [norm, ...targetQueue]
        targetIdx = 0
      }

      setQueue(targetQueue)
      setQueueIndex(targetIdx)
      loadAndPlay(norm)
    },
    [loadAndPlay],
  )

  // Play a full queue starting at index
  const playQueue = useCallback(
    (songsList, startIndex = 0) => {
      if (!songsList || songsList.length === 0) return
      const normalizedQueue = songsList.map(normalizeSong)
      const validIndex = Math.max(0, Math.min(startIndex, normalizedQueue.length - 1))
      setQueue(normalizedQueue)
      setQueueIndex(validIndex)
      loadAndPlay(normalizedQueue[validIndex])
    },
    [loadAndPlay],
  )

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    const audio = audioRef.current

    if (isPlaying) {
      audio.pause()
    } else {
      if (!currentSong) {
        // If queue exists, play first song
        if (queue.length > 0) {
          playQueue(queue, 0)
        }
        return
      }
      audio.play().catch((err) => {
        console.warn('Playback error:', err)
        setError('Playback failed.')
      })
    }
  }, [isPlaying, currentSong, queue, playQueue])

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
  }, [])

  const resume = useCallback(() => {
    if (audioRef.current && currentSong) {
      audioRef.current.play().catch((err) => {
        console.warn('Resume error:', err)
      })
    }
  }, [currentSong])

  const seek = useCallback((timeInSeconds) => {
    if (audioRef.current) {
      const validTime = Math.max(0, Math.min(timeInSeconds, audioRef.current.duration || timeInSeconds))
      audioRef.current.currentTime = validTime
      setCurrentTime(validTime)
    }
  }, [])

  const setVolume = useCallback((val) => {
    const clamped = Math.max(0, Math.min(val, 1))
    if (audioRef.current) {
      audioRef.current.volume = clamped
      if (clamped > 0 && audioRef.current.muted) {
        audioRef.current.muted = false
        setIsMuted(false)
      }
    }
    setVolumeState(clamped)
  }, [])

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      const nextMuted = !audioRef.current.muted
      audioRef.current.muted = nextMuted
      setIsMuted(nextMuted)
    }
  }, [])

  const addToQueue = useCallback((song) => {
    if (!song) return
    const norm = normalizeSong(song)
    setQueue((prev) => [...prev, norm])
  }, [])

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev)
  }, [])

  const cycleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all'
      if (prev === 'all') return 'one'
      return 'off'
    })
  }, [])

  const toggleCurrentSongLike = useCallback(
    async (user) => {
      if (!user || !currentSong) return
      try {
        if (currentSong.isLiked) {
          const res = await apiUnlikeSong(currentSong.id)
          setCurrentSong((prev) => (prev ? { ...prev, isLiked: false, likeCount: res.data.likeCount } : prev))
        } else {
          const res = await apiLikeSong(currentSong.id)
          setCurrentSong((prev) => (prev ? { ...prev, isLiked: true, likeCount: res.data.likeCount } : prev))
        }
      } catch (err) {
        console.error('Failed to toggle like on current song:', err)
      }
    },
    [currentSong],
  )

  const updateSongLikeStatus = useCallback((songId, isLiked, likeCount) => {
    setCurrentSong((prev) => {
      if (prev && prev.id === songId) {
        return {
          ...prev,
          isLiked,
          likeCount: typeof likeCount === 'number' ? likeCount : prev.likeCount,
        }
      }
      return prev
    })
  }, [])

  const value = {
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
    playSong,
    playQueue,
    togglePlay,
    pause,
    resume,
    next,
    prev,
    seek,
    setVolume,
    toggleMute,
    addToQueue,
    toggleShuffle,
    cycleRepeat,
    toggleCurrentSongLike,
    updateSongLikeStatus,
  }

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider')
  }
  return context
}
