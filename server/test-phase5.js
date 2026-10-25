const { pool } = require('./config/database');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== PHASE 5 AUTOMATED TEST SUITE ===');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Unauthenticated access blocked
    const unauthRes = await fetch(`${BASE_URL}/admin/stats`);
    assert(unauthRes.status === 401, 'Unauthenticated request to /api/admin/stats returns 401');

    // 2. Register a listener user to test listener authorization
    const listenerEmail = `listener_${Date.now()}@test.com`;
    const regListenerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Normal Listener',
        email: listenerEmail,
        password: 'password123',
        role: 'listener',
      }),
    });
    const listenerData = await regListenerRes.json();
    const listenerToken = listenerData.data.token;

    // 3. Listener access blocked
    const listenerForbiddenRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${listenerToken}` },
    });
    assert(listenerForbiddenRes.status === 403, 'Listener request to /api/admin/stats returns 403 Forbidden');

    // 4. Register an artist to test artist authorization
    const artistEmail = `artist_${Date.now()}@test.com`;
    const regArtistRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Independent Artist',
        email: artistEmail,
        password: 'password123',
        role: 'artist',
      }),
    });
    const artistData = await regArtistRes.json();
    const artistToken = artistData.data.token;
    const testArtistUserId = artistData.data.user.id;

    // 5. Artist access blocked
    const artistForbiddenRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${artistToken}` },
    });
    assert(artistForbiddenRes.status === 403, 'Artist request to /api/admin/stats returns 403 Forbidden');

    // 6. Admin login
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@indiehub.com',
        password: 'Admin123!',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, 'Admin login succeeded');
    const adminToken = adminLoginData.data.token;
    const adminId = adminLoginData.data.user.id;
    assert(adminLoginData.data.user.role === 'admin', 'User has admin role claim');

    // 7. GET /api/admin/stats
    const statsRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(statsRes.status === 200, 'GET /api/admin/stats returned 200');
    const statsData = await statsRes.json();
    assert(typeof statsData.data.stats.totalUsers === 'number', 'Stats contains totalUsers');
    assert(typeof statsData.data.stats.totalSongs === 'number', 'Stats contains totalSongs');
    assert(typeof statsData.data.stats.pendingSongs === 'number', 'Stats contains pendingSongs');

    // 8. Upload a test pending song as the artist
    const audioBlob = new Blob([new Uint8Array([0xFF, 0xFB, 0x90, 0x44, 0x00, 0x00])], { type: 'audio/mpeg' });
    const uploadForm = new FormData();
    uploadForm.append('audio', audioBlob, 'pending_test.mp3');
    uploadForm.append('title', 'Pending Test Track A');
    uploadForm.append('genre', 'Lo-fi');

    const songUploadRes = await fetch(`${BASE_URL}/songs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${artistToken}` },
      body: uploadForm,
    });
    const songUploadData = await songUploadRes.json();
    const songId = songUploadData.data.songId;
    assert(songUploadData.data.status === 'pending', 'Test song uploaded with status "pending"');

    // 9. GET /api/admin/songs/pending
    const pendingSongsRes = await fetch(`${BASE_URL}/admin/songs/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pendingSongsData = await pendingSongsRes.json();
    assert(pendingSongsRes.status === 200, 'GET /api/admin/songs/pending returned 200');
    const foundPending = pendingSongsData.data.songs.some((s) => s.id === songId);
    assert(foundPending, 'Uploaded pending song appears in admin pending list');

    // 10. PUT /api/admin/songs/:id/approve
    const approveRes = await fetch(`${BASE_URL}/admin/songs/${songId}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const approveData = await approveRes.json();
    assert(approveRes.status === 200 && approveData.data.status === 'approved', 'PUT /api/admin/songs/:id/approve sets status to "approved"');

    // Verify it is now visible in public /api/songs
    const publicSongsRes = await fetch(`${BASE_URL}/songs`);
    const publicSongsData = await publicSongsRes.json();
    const foundApproved = publicSongsData.data.songs.some((s) => s.id === songId);
    assert(foundApproved, 'Approved song now appears in public song discovery');

    // 11. Upload second song and test PUT /api/admin/songs/:id/reject
    const uploadFormB = new FormData();
    uploadFormB.append('audio', audioBlob, 'pending_test_b.mp3');
    uploadFormB.append('title', 'Pending Test Track B');
    const songUploadResB = await fetch(`${BASE_URL}/songs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${artistToken}` },
      body: uploadFormB,
    });
    const songIdB = (await songUploadResB.json()).data.songId;

    const rejectRes = await fetch(`${BASE_URL}/admin/songs/${songIdB}/reject`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const rejectData = await rejectRes.json();
    assert(rejectRes.status === 200 && rejectData.data.status === 'rejected', 'PUT /api/admin/songs/:id/reject sets status to "rejected"');

    // 12. Test DELETE /api/admin/songs/:id
    const deleteSongRes = await fetch(`${BASE_URL}/admin/songs/${songIdB}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(deleteSongRes.status === 200, 'DELETE /api/admin/songs/:id deletes song permanently');

    // 13. GET /api/admin/users
    const usersRes = await fetch(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const usersData = await usersRes.json();
    assert(usersRes.status === 200, 'GET /api/admin/users returns 200');
    assert(Array.isArray(usersData.data.users), 'Users data is an array');

    // 14. Test user suspension: PUT /api/admin/users/:id/status
    const suspendRes = await fetch(`${BASE_URL}/admin/users/${testArtistUserId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'suspended' }),
    });
    assert(suspendRes.status === 200, 'PUT /api/admin/users/:id/status successfully suspends user');

    // Verify suspended user cannot log in
    const blockedLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: artistEmail,
        password: 'password123',
      }),
    });
    assert(blockedLoginRes.status === 403, 'Suspended user login rejected with 403');

    // Re-activate user
    const activateRes = await fetch(`${BASE_URL}/admin/users/${testArtistUserId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'active' }),
    });
    assert(activateRes.status === 200, 'User re-activated successfully');

    // Verify admin cannot suspend or delete self
    const selfSuspendRes = await fetch(`${BASE_URL}/admin/users/${adminId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'suspended' }),
    });
    assert(selfSuspendRes.status === 400, 'Admin cannot suspend their own account (returns 400)');

    const selfDeleteRes = await fetch(`${BASE_URL}/admin/users/${adminId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(selfDeleteRes.status === 400, 'Admin cannot delete their own account (returns 400)');

    // 15. GET /api/admin/artists
    const artistsRes = await fetch(`${BASE_URL}/admin/artists`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const artistsData = await artistsRes.json();
    assert(artistsRes.status === 200, 'GET /api/admin/artists returns 200');
    const targetArtist = artistsData.data.artists.find((a) => a.userId === testArtistUserId);
    assert(!!targetArtist, 'Created test artist found in admin artist list');

    // 16. PUT /api/admin/artists/:id/verify
    const verifyRes = await fetch(`${BASE_URL}/admin/artists/${targetArtist.id}/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ verified: true }),
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 200 && verifyData.data.verified === true, 'Artist verified successfully');

    // 17. Cleanup test entities
    await fetch(`${BASE_URL}/admin/users/${testArtistUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    await pool.execute('DELETE FROM users WHERE email = ?', [listenerEmail]);

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runTests();
