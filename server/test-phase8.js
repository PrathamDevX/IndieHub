const { pool } = require('./config/database');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== PHASE 8 AUTOMATED TEST SUITE: PLAYLISTS ===');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const emailA = `playlist_user_a_${timestamp}@test.com`;
  const emailB = `playlist_user_b_${timestamp}@test.com`;
  let tokenA = null;
  let tokenB = null;
  let userAId = null;
  let userBId = null;
  let artistId = null;
  let approvedSongId = null;
  let pendingSongId = null;
  let playlistId = null;

  try {
    // 1. Health check
    const health = await fetch(`${BASE_URL}/health`).catch(() => null);
    assert(health !== null, 'Server is running and responsive on port 5000');

    // 2. Register User A
    const regResA = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Playlist User A', email: emailA, password: 'Password123!', role: 'listener' }),
    });
    const regJsonA = await regResA.json();
    assert(regResA.status === 201, 'User A registered with 201');
    tokenA = regJsonA.data.token;
    userAId = regJsonA.data.user.id;

    // 3. Register User B
    const regResB = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Playlist User B', email: emailB, password: 'Password123!', role: 'listener' }),
    });
    const regJsonB = await regResB.json();
    assert(regResB.status === 201, 'User B registered with 201');
    tokenB = regJsonB.data.token;
    userBId = regJsonB.data.user.id;

    // 4. Unauthenticated create playlist
    const unauthRes = await fetch(`${BASE_URL}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Secret Hits' }),
    });
    assert(unauthRes.status === 401, 'Unauthenticated POST /api/playlists rejected with 401');

    // 5. Create playlist with empty name
    const invalidRes = await fetch(`${BASE_URL}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ name: '' }),
    });
    assert(invalidRes.status === 422, 'Empty playlist name rejected with 422');

    // 6. User A creates playlist
    const createRes = await fetch(`${BASE_URL}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ name: 'Late Night Synth', description: 'Chill atmospheric sounds' }),
    });
    const createJson = await createRes.json();
    assert(createRes.status === 201, 'POST /api/playlists returned 201 Created');
    assert(createJson.success === true, 'Response contains success: true');
    playlistId = createJson.data?.playlistId;
    assert(Boolean(playlistId), `Created playlist ID: ${playlistId}`);

    // 7. User A fetches own playlists
    const myPlaylistsRes = await fetch(`${BASE_URL}/playlists/my`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const myPlaylistsJson = await myPlaylistsRes.json();
    assert(myPlaylistsRes.status === 200, 'GET /api/playlists/my returned 200');
    assert(Array.isArray(myPlaylistsJson.data?.playlists), 'My playlists is an array');
    const userAPlaylist = myPlaylistsJson.data?.playlists?.find((p) => p.id === playlistId);
    assert(Boolean(userAPlaylist), 'User A playlist found in their list');
    assert(userAPlaylist?.name === 'Late Night Synth', 'Playlist name matches');
    assert(userAPlaylist?.songCount === 0, 'Initial song count is 0');

    // 8. User B fetches own playlists -> should be empty
    const userBPlaylistsRes = await fetch(`${BASE_URL}/playlists/my`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const userBPlaylistsJson = await userBPlaylistsRes.json();
    const foundInB = userBPlaylistsJson.data?.playlists?.find((p) => p.id === playlistId);
    assert(!foundInB, 'User A playlist does NOT appear in User B own playlists');

    // 9. Public playlist list includes User A's playlist
    const publicRes = await fetch(`${BASE_URL}/playlists`);
    const publicJson = await publicRes.json();
    assert(publicRes.status === 200, 'GET /api/playlists returns 200');
    const inPublic = publicJson.data?.playlists?.find((p) => p.id === playlistId);
    assert(Boolean(inPublic), 'Playlist appears in public playlists');
    assert(inPublic?.userName === 'Playlist User A', 'Public playlist includes creator user name');

    // 10. Get playlist by ID with User A (owner)
    const getOwnerRes = await fetch(`${BASE_URL}/playlists/${playlistId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const getOwnerJson = await getOwnerRes.json();
    assert(getOwnerRes.status === 200, 'GET /api/playlists/:id returned 200 for owner');
    assert(getOwnerJson.data?.playlist?.isOwner === true, 'isOwner is true for owner');

    // 11. Get playlist by ID with User B (non-owner)
    const getNonOwnerRes = await fetch(`${BASE_URL}/playlists/${playlistId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const getNonOwnerJson = await getNonOwnerRes.json();
    assert(getNonOwnerRes.status === 200, 'GET /api/playlists/:id returned 200 for non-owner');
    assert(getNonOwnerJson.data?.playlist?.isOwner === false, 'isOwner is false for non-owner');

    // 12. Create test songs (one approved, one pending)
    const [[existingArtist]] = await pool.execute('SELECT id FROM artists LIMIT 1');
    artistId = existingArtist?.id;

    if (!artistId) {
      const [u] = await pool.execute(`INSERT INTO users (name, email, password_hash, role) VALUES ('P8 Artist', 'p8_art@test.com', 'pwd', 'artist')`);
      const [a] = await pool.execute(`INSERT INTO artists (user_id, artist_name) VALUES (?, 'P8 Artist')`, [u.insertId]);
      artistId = a.insertId;
    }

    const [s1] = await pool.execute(
      `INSERT INTO songs (artist_id, title, audio_url, duration, status)
       VALUES (?, 'P8 Approved Song', '/uploads/songs/p8-app.mp3', 200, 'approved')`,
      [artistId]
    );
    approvedSongId = s1.insertId;

    const [s2] = await pool.execute(
      `INSERT INTO songs (artist_id, title, audio_url, duration, status)
       VALUES (?, 'P8 Pending Song', '/uploads/songs/p8-pend.mp3', 150, 'pending')`,
      [artistId]
    );
    pendingSongId = s2.insertId;

    // 13. User A adds approved song to playlist
    const addRes = await fetch(`${BASE_URL}/playlists/${playlistId}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ songId: approvedSongId }),
    });
    assert(addRes.status === 201, 'POST /api/playlists/:id/songs added song with 201 Created');

    // 14. User A adds same song again -> duplicate check
    const dupRes = await fetch(`${BASE_URL}/playlists/${playlistId}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ songId: approvedSongId }),
    });
    assert(dupRes.status === 409, 'Duplicate song addition returns 409 Conflict');

    // 15. User A tries to add pending song -> rejected
    const pendAddRes = await fetch(`${BASE_URL}/playlists/${playlistId}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ songId: pendingSongId }),
    });
    assert(pendAddRes.status === 404, 'Adding unapproved (pending) song returns 404');

    // 16. User B tries to add song to User A's playlist -> 403 Forbidden
    const unauthAddRes = await fetch(`${BASE_URL}/playlists/${playlistId}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ songId: approvedSongId }),
    });
    assert(unauthAddRes.status === 403, 'Non-owner cannot add songs to another user playlist (403)');

    // 17. Verify song is present in playlist details
    const detailRes = await fetch(`${BASE_URL}/playlists/${playlistId}`);
    const detailJson = await detailRes.json();
    assert(detailJson.data?.playlist?.songCount === 1, 'Playlist songCount is 1');
    assert(detailJson.data?.playlist?.songs[0]?.id === approvedSongId, 'Song in playlist is the approved test song');
    assert(detailJson.data?.playlist?.songs[0]?.title === 'P8 Approved Song', 'Song title returned correctly');

    // 18. User B tries to remove song from User A's playlist -> 403 Forbidden
    const unauthRemRes = await fetch(`${BASE_URL}/playlists/${playlistId}/songs/${approvedSongId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(unauthRemRes.status === 403, 'Non-owner cannot remove song from another user playlist (403)');

    // 19. User A removes song from playlist
    const remRes = await fetch(`${BASE_URL}/playlists/${playlistId}/songs/${approvedSongId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(remRes.status === 200, 'Owner successfully removes song from playlist with 200');

    const verifyEmpty = await fetch(`${BASE_URL}/playlists/${playlistId}`);
    const verifyEmptyJson = await verifyEmpty.json();
    assert(verifyEmptyJson.data?.playlist?.songs.length === 0, 'Playlist songs list is now empty');

    // 20. User B tries to update User A's playlist -> 403 Forbidden
    const unauthUpdRes = await fetch(`${BASE_URL}/playlists/${playlistId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ name: 'Hacked Title' }),
    });
    assert(unauthUpdRes.status === 403, 'Non-owner cannot update playlist (403)');

    // 21. User A updates playlist name and description
    const updateRes = await fetch(`${BASE_URL}/playlists/${playlistId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ name: 'Updated Synth Waves', description: 'New description' }),
    });
    assert(updateRes.status === 200, 'Owner updates playlist with 200');

    const verifyUpd = await fetch(`${BASE_URL}/playlists/${playlistId}`);
    const verifyUpdJson = await verifyUpd.json();
    assert(verifyUpdJson.data?.playlist?.name === 'Updated Synth Waves', 'Updated name persisted');

    // 22. User B tries to delete User A's playlist -> 403 Forbidden
    const unauthDelRes = await fetch(`${BASE_URL}/playlists/${playlistId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(unauthDelRes.status === 403, 'Non-owner cannot delete playlist (403)');

    // 23. User A deletes playlist
    const delRes = await fetch(`${BASE_URL}/playlists/${playlistId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(delRes.status === 200, 'Owner deletes playlist with 200');

    // 24. Fetch deleted playlist -> 404
    const getDelRes = await fetch(`${BASE_URL}/playlists/${playlistId}`);
    assert(getDelRes.status === 404, 'Deleted playlist returns 404 Not Found');

    // 25. Cleanup
    await pool.execute('DELETE FROM songs WHERE id IN (?, ?)', [approvedSongId, pendingSongId]);
    await pool.execute('DELETE FROM users WHERE id IN (?, ?)', [userAId, userBId]);
    assert(true, 'Test users and songs cleaned up cleanly');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    console.log(`\nPhase 8 Test Results: ${passed} passed, ${failed} failed`);
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
