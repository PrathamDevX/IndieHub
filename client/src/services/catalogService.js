import api from './api'

export async function getSongs(params = {}) {
  const { data } = await api.get('/songs', { params })
  return data.data.songs
}

export async function getArtists(params = {}) {
  const { data } = await api.get('/artists', { params })
  return data.data.artists
}

export async function getArtist(id) {
  const { data } = await api.get(`/artists/${id}`)
  return data.data
}

export async function incrementPlayCount(id) {
  return api.post(`/songs/${id}/play`)
}

/**
 * Upload a new song with audio file and optional cover image.
 * Returns Axios response so callers can track upload progress via onUploadProgress.
 */
export async function uploadSong(formData, onUploadProgress) {
  const { data } = await api.post('/songs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })
  return data
}

export async function likeSong(id) {
  const { data } = await api.post(`/songs/${id}/like`)
  return data
}

export async function unlikeSong(id) {
  const { data } = await api.delete(`/songs/${id}/like`)
  return data
}

export async function getLikedSongs() {
  const { data } = await api.get('/songs/liked')
  return data.data.songs
}

export async function followArtist(id) {
  const { data } = await api.post(`/artists/${id}/follow`)
  return data
}

export async function unfollowArtist(id) {
  const { data } = await api.delete(`/artists/${id}/follow`)
  return data
}

export async function getFollowedArtists() {
  const { data } = await api.get('/artists/followed')
  return data.data.artists
}

