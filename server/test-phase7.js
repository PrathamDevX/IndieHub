const { pool } = require('./config/database');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Starting Phase 7 (Real Music Player & Play Tracking) Verification ---');
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

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/admin/stats`).catch(() => null);
    assert(healthRes !== null, 'Server is running and accessible on port 5000');

    // 2. Play count on non-existent song
    const nonExistentRes = await fetch(`${BASE_URL}/songs/9999999/play`, { method: 'POST' });
    const nonExistentJson = await nonExistentRes.json();
    assert(nonExistentRes.status === 404, 'POST /api/songs/9999999/play returns 404 for non-existent song');
    assert(nonExistentJson.success === false, 'Non-existent play returns success: false');

    // 3. Find or create an artist to host test songs
    const [[existingArtist]] = await pool.execute('SELECT id FROM artists LIMIT 1');
    let artistId = existingArtist?.id;
    let createdArtist = false;
    let createdUser = false;
    let userId = null;

    if (!artistId) {
      const [uRes] = await pool.execute(
        `INSERT INTO users (name, email, password_hash, role) VALUES ('Test Artist User', 'testartist_p7@test.com', 'dummy', 'artist')`
      );
      userId = uRes.insertId;
      createdUser = true;

      const [aRes] = await pool.execute(
        `INSERT INTO artists (user_id, artist_name, bio) VALUES (?, 'Phase 7 Artist', 'Testing player')`,
        [userId]
      );
      artistId = aRes.insertId;
      createdArtist = true;
    }

    // 4. Create an approved test song and a pending test song
    const [songRes] = await pool.execute(
      `INSERT INTO songs (artist_id, title, audio_url, duration, status, play_count)
       VALUES (?, 'Phase 7 Approved Track', '/uploads/songs/phase7-test.mp3', 215, 'approved', 10)`,
      [artistId]
    );
    const approvedSongId = songRes.insertId;

    const [pendingRes] = await pool.execute(
      `INSERT INTO songs (artist_id, title, audio_url, duration, status, play_count)
       VALUES (?, 'Phase 7 Pending Track', '/uploads/songs/phase7-pending.mp3', 180, 'pending', 0)`,
      [artistId]
    );
    const pendingSongId = pendingRes.insertId;

    // 5. Play count on approved song (unauthenticated public access)
    const playRes1 = await fetch(`${BASE_URL}/songs/${approvedSongId}/play`, { method: 'POST' });
    const playJson1 = await playRes1.json();
    assert(playRes1.status === 200, 'POST /api/songs/:id/play returns 200 for approved song');
    assert(playJson1.success === true, 'Play response contains success: true');

    const [[row1]] = await pool.execute('SELECT play_count FROM songs WHERE id = ?', [approvedSongId]);
    assert(row1.play_count === 11, `play_count incremented from 10 to 11 (actual: ${row1.play_count})`);

    // 6. Play count again (subsequent stream)
    const playRes2 = await fetch(`${BASE_URL}/songs/${approvedSongId}/play`, { method: 'POST' });
    assert(playRes2.status === 200, 'Subsequent play returns 200');

    const [[row2]] = await pool.execute('SELECT play_count FROM songs WHERE id = ?', [approvedSongId]);
    assert(row2.play_count === 12, `play_count incremented from 11 to 12 (actual: ${row2.play_count})`);

    // 7. Verify pending song play is rejected with 404
    const pendingPlayRes = await fetch(`${BASE_URL}/songs/${pendingSongId}/play`, { method: 'POST' });
    const pendingPlayJson = await pendingPlayRes.json();
    assert(pendingPlayRes.status === 404, 'POST /api/songs/:id/play returns 404 for unapproved (pending) song');
    assert(pendingPlayJson.success === false, 'Pending song play returns success: false');

    const [[pendingRow]] = await pool.execute('SELECT play_count FROM songs WHERE id = ?', [pendingSongId]);
    assert(pendingRow.play_count === 0, `Pending song play_count unchanged at 0 (actual: ${pendingRow.play_count})`);

    // 8. Verify GET /api/songs returns approved song with playCount and audioUrl
    const listRes = await fetch(`${BASE_URL}/songs?search=Phase 7 Approved Track`);
    const listJson = await listRes.json();
    assert(listRes.status === 200, 'GET /api/songs returns 200');
    assert(Array.isArray(listJson.data?.songs), 'GET /api/songs returns array of songs');
    const foundApproved = listJson.data?.songs?.find((s) => s.id === approvedSongId);
    assert(Boolean(foundApproved), 'Approved test track is listed in public catalog');
    assert(foundApproved?.playCount === 12, `Song playCount in API is 12 (actual: ${foundApproved?.playCount})`);
    assert(foundApproved?.audioUrl === '/uploads/songs/phase7-test.mp3', 'Song audioUrl is populated');

    // 9. Verify GET /api/songs does NOT include pending song
    const foundPending = listJson.data?.songs?.find((s) => s.id === pendingSongId);
    assert(!foundPending, 'Pending test track is NOT listed in public catalog');

    // 10. Verify GET /api/songs/:id returns song with metadata
    const getRes = await fetch(`${BASE_URL}/songs/${approvedSongId}`);
    const getJson = await getRes.json();
    assert(getRes.status === 200, 'GET /api/songs/:id returns 200');
    assert(getJson.data?.song?.id === approvedSongId, 'GET /api/songs/:id returns correct song');
    assert(getJson.data?.song?.playCount === 12, 'GET /api/songs/:id returns updated playCount');

    // Cleanup
    await pool.execute('DELETE FROM songs WHERE id IN (?, ?)', [approvedSongId, pendingSongId]);
    if (createdArtist) {
      await pool.execute('DELETE FROM artists WHERE id = ?', [artistId]);
    }
    if (createdUser && userId) {
      await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
    }
    assert(true, 'Test artifacts and database records cleaned up cleanly');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    console.log(`\nPhase 7 Test Results: ${passed} passed, ${failed} failed`);
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
