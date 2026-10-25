import api from './api';

// Fetch the logged-in artist's dashboard data
export async function getOwnDashboard() {
  const { data } = await api.get('/artists/me/dashboard');
  return data.data;
}
