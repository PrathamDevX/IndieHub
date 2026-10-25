import { useState, useRef } from 'react'
import { ArrowLeft, CheckCircle, CloudUpload, FileAudio, ImagePlus, LoaderCircle, Music2, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { uploadSong } from '../services/catalogService'

const GENRES = [
  'Alternative', 'Ambient', 'Blues', 'Classical', 'Country', 'Dream Pop',
  'Electronic', 'Folk', 'Funk', 'Hip Hop', 'Indie', 'Jazz', 'Lo-fi',
  'Metal', 'Neo Soul', 'Pop', 'Punk', 'R&B', 'Reggae', 'Rock', 'Soul', 'World',
]

const MAX_AUDIO_MB = 50
const MAX_IMAGE_MB = 5

export default function UploadSongPage() {
  const [form, setForm] = useState({ title: '', description: '', genre: '', albumId: '' })
  const [audioFile, setAudioFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('idle') // idle | uploading | success | error
  const [message, setMessage] = useState('')
  const audioInputRef = useRef(null)
  const coverInputRef = useRef(null)

  function update(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleAudioSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) {
      setMessage(`Audio file must be under ${MAX_AUDIO_MB} MB.`)
      setStatus('error')
      return
    }
    setAudioFile(file)
    setMessage('')
    setStatus('idle')
  }

  function handleCoverSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setMessage(`Cover image must be under ${MAX_IMAGE_MB} MB.`)
      setStatus('error')
      return
    }
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
    setMessage('')
    setStatus('idle')
  }

  function removeAudio() {
    setAudioFile(null)
    if (audioInputRef.current) audioInputRef.current.value = ''
  }

  function removeCover() {
    setCoverFile(null)
    setCoverPreview(null)
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!audioFile) {
      setMessage('Please select an audio file.')
      setStatus('error')
      return
    }
    if (!form.title.trim()) {
      setMessage('Song title is required.')
      setStatus('error')
      return
    }

    const data = new FormData()
    data.append('audio', audioFile)
    if (coverFile) data.append('cover', coverFile)
    data.append('title', form.title.trim())
    if (form.description.trim()) data.append('description', form.description.trim())
    if (form.genre) data.append('genre', form.genre)
    if (form.albumId) data.append('albumId', form.albumId)

    setStatus('uploading')
    setProgress(0)
    setMessage('')

    try {
      const result = await uploadSong(data, (progressEvent) => {
        const pct = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1))
        setProgress(pct)
      })
      setStatus('success')
      setMessage(result.message || 'Song uploaded successfully! It will be reviewed by an admin.')
      // Reset form
      setForm({ title: '', description: '', genre: '', albumId: '' })
      setAudioFile(null)
      setCoverFile(null)
      setCoverPreview(null)
      setProgress(0)
      if (audioInputRef.current) audioInputRef.current.value = ''
      if (coverInputRef.current) coverInputRef.current.value = ''
    } catch (err) {
      setStatus('error')
      setMessage(err.response?.data?.message || 'Upload failed. Please try again.')
    }
  }

  const isUploading = status === 'uploading'

  return (
    <main className="content upload-page">
      <Link className="back-link" to="/discover"><ArrowLeft size={16} /> Back to discover</Link>

      <div className="page-heading">
        <div>
          <p className="eyebrow"><CloudUpload size={15} /> Share your music</p>
          <h1>Upload a song</h1>
          <p className="upload-subtitle">Your track will be reviewed before going live on IndieHub.</p>
        </div>
      </div>

      {status === 'success' && (
        <div className="upload-banner upload-banner--success">
          <CheckCircle size={20} />
          <span>{message}</span>
        </div>
      )}

      <form className="upload-form" onSubmit={handleSubmit}>
        {/* ---- Audio file ---- */}
        <div className="upload-dropzone" onClick={() => !isUploading && audioInputRef.current?.click()}>
          <input
            type="file"
            ref={audioInputRef}
            accept="audio/*"
            onChange={handleAudioSelect}
            hidden
          />
          {audioFile ? (
            <div className="file-chosen">
              <FileAudio size={22} />
              <div>
                <strong>{audioFile.name}</strong>
                <span>{(audioFile.size / 1024 / 1024).toFixed(1)} MB</span>
              </div>
              {!isUploading && (
                <button type="button" className="remove-file" onClick={(e) => { e.stopPropagation(); removeAudio() }}>
                  <XCircle size={18} />
                </button>
              )}
            </div>
          ) : (
            <div className="dropzone-placeholder">
              <Music2 size={32} />
              <strong>Select audio file</strong>
              <span>MP3, WAV, OGG, FLAC, AAC — up to {MAX_AUDIO_MB} MB</span>
            </div>
          )}
        </div>

        {/* ---- Cover image ---- */}
        <div className="upload-cover-section">
          <label className="field-label">Cover image <span className="optional">(optional)</span></label>
          <div className="cover-picker" onClick={() => !isUploading && coverInputRef.current?.click()}>
            <input
              type="file"
              ref={coverInputRef}
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleCoverSelect}
              hidden
            />
            {coverPreview ? (
              <div className="cover-preview-wrap">
                <img src={coverPreview} alt="Cover preview" className="cover-preview-img" />
                {!isUploading && (
                  <button type="button" className="remove-file cover-remove" onClick={(e) => { e.stopPropagation(); removeCover() }}>
                    <XCircle size={16} />
                  </button>
                )}
              </div>
            ) : (
              <div className="cover-placeholder">
                <ImagePlus size={24} />
                <span>Add cover art</span>
              </div>
            )}
          </div>
        </div>

        {/* ---- Text fields ---- */}
        <label>
          Song title *
          <input name="title" value={form.title} onChange={update} placeholder="Name your track" maxLength={200} required disabled={isUploading} />
        </label>

        <label>
          Description <span className="optional">(optional)</span>
          <textarea name="description" value={form.description} onChange={update} placeholder="Tell listeners about this track..." rows={3} disabled={isUploading} />
        </label>

        <label>
          Genre <span className="optional">(optional)</span>
          <select name="genre" value={form.genre} onChange={update} disabled={isUploading}>
            <option value="">Select a genre</option>
            {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>

        {/* ---- Progress bar ---- */}
        {isUploading && (
          <div className="upload-progress">
            <div className="upload-progress-bar">
              <div className="upload-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="upload-progress-text">{progress}%</span>
          </div>
        )}

        {/* ---- Error ---- */}
        {status === 'error' && <div className="form-error">{message}</div>}

        {/* ---- Submit ---- */}
        <button className="button-primary upload-submit" type="submit" disabled={isUploading}>
          {isUploading ? <><LoaderCircle className="spin" size={17} /> Uploading...</> : <><CloudUpload size={17} /> Upload song</>}
        </button>
      </form>
    </main>
  )
}
