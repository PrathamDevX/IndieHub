import api from './api'

export async function createPlaylist({ name, description }) {
  const { data } = await api.post('/playlists', { name, description })
  return data
}

export async function getMyPlaylists() {
  const { data } = await api.get('/playlists/my')
  return data.data.playlists
}

export async function getPlaylists(params = {}) {
  const { data } = await api.get('/playlists', { params })
  return data.data.playlists
}

export async function getPlaylist(id) {
  const { data } = await api.get(`/playlists/${id}`)
  return data.data.playlist
}

export async function updatePlaylist(id, { name, description }) {
  const { data } = await api.put(`/playlists/${id}`, { name, description })
  return data
}

export async function deletePlaylist(id) {
  const { data } = await api.delete(`/playlists/${id}`)
  return data
}

export async function addSongToPlaylist(playlistId, songId) {
  const { data } = await api.post(`/playlists/${playlistId}/songs`, { songId })
  return data
}

export async function removeSongFromPlaylist(playlistId, songId) {
  const { data } = await api.delete(`/playlists/${playlistId}/songs/${songId}`)
  return data
}
