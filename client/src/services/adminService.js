import api from './api'

export async function getAdminStats() {
  const { data } = await api.get('/admin/stats')
  return data.data.stats
}

export async function getPendingSongs() {
  const { data } = await api.get('/admin/songs/pending')
  return data.data.songs
}

export async function approveSong(id) {
  const { data } = await api.put(`/admin/songs/${id}/approve`)
  return data
}

export async function rejectSong(id) {
  const { data } = await api.put(`/admin/songs/${id}/reject`)
  return data
}

export async function deleteSong(id) {
  const { data } = await api.delete(`/admin/songs/${id}`)
  return data
}

export async function getAdminUsers(params = {}) {
  const { data } = await api.get('/admin/users', { params })
  return data.data.users
}

export async function updateUserStatus(id, status) {
  const { data } = await api.put(`/admin/users/${id}/status`, { status })
  return data
}

export async function deleteUser(id) {
  const { data } = await api.delete(`/admin/users/${id}`)
  return data
}

export async function getAdminArtists(params = {}) {
  const { data } = await api.get('/admin/artists', { params })
  return data.data.artists
}

export async function verifyArtist(id, verified) {
  const { data } = await api.put(`/admin/artists/${id}/verify`, { verified })
  return data
}
