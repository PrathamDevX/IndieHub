import api from './api'

export async function getSongComments(songId) {
  const { data } = await api.get(`/songs/${songId}/comments`)
  return data.data.comments
}

export async function createSongComment(songId, comment) {
  const { data } = await api.post(`/songs/${songId}/comments`, { comment })
  return data.data.comment
}

export async function updateComment(commentId, comment) {
  const { data } = await api.put(`/comments/${commentId}`, { comment })
  return data.data.comment
}

export async function deleteComment(commentId) {
  const { data } = await api.delete(`/comments/${commentId}`)
  return data
}
