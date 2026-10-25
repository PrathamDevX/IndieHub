const { pool } = require('./config/database');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== PHASE 9 AUTOMATED TEST SUITE: COMMENTS & SONG DISCUSSIONS ===');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  + ${message}`);
      passed++;
    } else {
      console.error(`  FAIL: ${message}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const emailA = `comment_user_a_${timestamp}@test.com`;
  const emailB = `comment_user_b_${timestamp}@test.com`;
  const artistEmail = `comment_artist_${timestamp}@test.com`;

  let tokenA = null, tokenB = null, artistToken = null, adminToken = null;
  let userAId = null, userBId = null, artistUserId = null, artistProfileId = null;
  let approvedSongId = null, pendingSongId = null;
  let comment1Id = null, comment2Id = null;

  try {
    // 1. Health check
    const health = await fetch(`${BASE_URL}/health`).catch(() => null);
    assert(health !== null, 'Server is running on port 5000');

    // 2. Register User A
    const regResA = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice Listener', email: emailA, password: 'Password123!', role: 'listener' }),
    });
    const regJsonA = await regResA.json();
    assert(regResA.status === 201, 'User A registered with 201');
    tokenA = regJsonA.data.token;
    userAId = regJsonA.data.user.id;

    // 3. Register User B
    const regResB = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bob Listener', email: emailB, password: 'Password123!', role: 'listener' }),
    });
    const regJsonB = await regResB.json();
    assert(regResB.status === 201, 'User B registered with 201');
    tokenB = regJsonB.data.token;
    userBId = regJsonB.data.user.id;

    // 4. Register Artist (auto-creates artist profile)
    const regResArtist = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Clara Artist', email: artistEmail, password: 'Password123!', role: 'artist' }),
    });
    const regJsonArtist = await regResArtist.json();
    assert(regResArtist.status === 201, 'Artist user registered with 201');
    artistToken = regJsonArtist.data.token;
    artistUserId = regJsonArtist.data.user.id;

    // Look up the auto-created artist profile
    const [artistRows] = await pool.query('SELECT id FROM artists WHERE user_id = ?', [artistUserId]);
    artistProfileId = artistRows[0] ? artistRows[0].id : null;
    assert(artistProfileId !== null, 'Artist profile auto-created on registration');

    // 5. Admin login
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@indiehub.com', password: 'Admin123!' }),
    });
    const adminLoginJson = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, 'Admin logged in with 200');
    adminToken = adminLoginJson.data.token;

    // 6. DB setup: Insert approved + pending songs
    const [approvedInsert] = await pool.query(
      "INSERT INTO songs (artist_id, title, duration, audio_url, status, genre, play_count) VALUES (?, 'Ocean Breeze', 195, 'https://example.com/audio1.mp3', 'approved', 'Dream Pop', 10)",
      [artistProfileId]
    );
    approvedSongId = approvedInsert.insertId;

    const [pendingInsert] = await pool.query(
      "INSERT INTO songs (artist_id, title, duration, audio_url, status, genre, play_count) VALUES (?, 'Unfinished Melody', 140, 'https://example.com/audio2.mp3', 'pending', 'Dream Pop', 0)",
      [artistProfileId]
    );
    pendingSongId = pendingInsert.insertId;

    // 7. Unauthenticated POST -> 401
    const r7 = await fetch(`${BASE_URL}/songs/${approvedSongId}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: 'Loving this!' }),
    });
    assert(r7.status === 401, 'Unauthenticated POST /songs/:id/comments returns 401');

    // 8. Empty comment -> 422
    const r8 = await fetch(`${BASE_URL}/songs/${approvedSongId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ comment: '   ' }),
    });
    assert(r8.status === 422, 'Empty comment returns 422');

    // 9. Oversized comment (>1000 chars) -> 422
    const r9 = await fetch(`${BASE_URL}/songs/${approvedSongId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ comment: 'A'.repeat(1005) }),
    });
    assert(r9.status === 422, 'Oversized comment (>1000 chars) returns 422');

    // 10. Comment on pending song -> 404
    const r10 = await fetch(`${BASE_URL}/songs/${pendingSongId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ comment: 'Can I hear this?' }),
    });
    assert(r10.status === 404, 'Comment on pending song returns 404');

    // 11. Comment on non-existent song -> 404
    const r11 = await fetch(`${BASE_URL}/songs/99999999/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ comment: 'Hello?' }),
    });
    assert(r11.status === 404, 'Comment on non-existent song returns 404');

    // 12. Valid comment by User A -> 201 with correct shape { data: { comment: {...} } }
    const r12 = await fetch(`${BASE_URL}/songs/${approvedSongId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ comment: 'The synth outro is immaculate!' }),
    });
    const j12 = await r12.json();
    assert(r12.status === 201, 'User A posts comment with 201');
    assert(j12.data && j12.data.comment && j12.data.comment.comment === 'The synth outro is immaculate!', 'Returned comment text matches input');
    assert(j12.data && j12.data.comment && j12.data.comment.userName === 'Alice Listener', 'Returned userName is Alice Listener');
    assert(j12.data && j12.data.comment && j12.data.comment.isAuthor === true, 'isAuthor is true for comment author');
    comment1Id = j12.data && j12.data.comment ? j12.data.comment.id : null;

    // 13. Artist posts reply -> 201
    const r13 = await fetch(`${BASE_URL}/songs/${approvedSongId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${artistToken}` },
      body: JSON.stringify({ comment: 'Thank you! Spent weeks on that synth.' }),
    });
    const j13 = await r13.json();
    assert(r13.status === 201, 'Artist posts comment with 201');
    assert(j13.data && j13.data.comment && j13.data.comment.userRole === 'artist', 'Artist comment has userRole = artist');
    comment2Id = j13.data && j13.data.comment ? j13.data.comment.id : null;

    // 14. Public GET -> 200 with shape { data: { comments: [...] } }
    const r14 = await fetch(`${BASE_URL}/songs/${approvedSongId}/comments`);
    const j14 = await r14.json();
    assert(r14.status === 200, 'GET /songs/:id/comments (public) returns 200');
    assert(j14.data && j14.data.comments && j14.data.comments.length === 2, 'Returns 2 comments in feed');
    assert(j14.data && j14.data.comments && j14.data.comments[0].isAuthor === false, 'isAuthor is false for unauthenticated requests');

    // 15. User A GET -> own comment has isAuthor: true
    const r15 = await fetch(`${BASE_URL}/songs/${approvedSongId}/comments`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const j15 = await r15.json();
    const c1 = j15.data && j15.data.comments ? j15.data.comments.find(c => c.id === comment1Id) : null;
    const c2 = j15.data && j15.data.comments ? j15.data.comments.find(c => c.id === comment2Id) : null;
    assert(c1 && c1.isAuthor === true, 'User A sees isAuthor: true on their own comment');
    assert(c2 && c2.isAuthor === false, 'User A sees isAuthor: false on artist comment');

    // 16. Song catalog includes commentCount >= 2
    const r16 = await fetch(`${BASE_URL}/songs`);
    const j16 = await r16.json();
    const foundSong = j16.data && j16.data.songs ? j16.data.songs.find(s => s.id === approvedSongId) : null;
    assert(foundSong && Number(foundSong.commentCount) >= 2, 'Song in catalog has commentCount >= 2');

    // 17. Non-author PUT -> 403
    const r17 = await fetch(`${BASE_URL}/comments/${comment1Id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ comment: 'Hacked!' }),
    });
    assert(r17.status === 403, 'Non-author PUT /comments/:id returns 403');

    // 18. Non-author DELETE -> 403
    const r18 = await fetch(`${BASE_URL}/comments/${comment1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(r18.status === 403, 'Non-author DELETE /comments/:id returns 403');

    // 19. Author updates with empty -> 422
    const r19 = await fetch(`${BASE_URL}/comments/${comment1Id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ comment: '   ' }),
    });
    assert(r19.status === 422, 'Author updating with empty text returns 422');

    // 20. Author updates own comment -> 200 with shape { data: { comment: {...} } }
    const r20 = await fetch(`${BASE_URL}/comments/${comment1Id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ comment: 'The synth outro is immaculate! Cannot stop listening.' }),
    });
    const j20 = await r20.json();
    assert(r20.status === 200, 'Author updates own comment with 200');
    assert(j20.data && j20.data.comment && j20.data.comment.comment.includes('Cannot stop'), 'Updated comment text is returned');

    // 21. PUT non-existent -> 404
    const r21 = await fetch(`${BASE_URL}/comments/99999999`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ comment: 'Ghost' }),
    });
    assert(r21.status === 404, 'PUT on non-existent comment returns 404');

    // 22. Admin moderates artist comment -> 200
    const r22 = await fetch(`${BASE_URL}/comments/${comment2Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(r22.status === 200, 'Admin deletes any comment with 200 (moderation)');

    // 23. 1 comment remains
    const r23 = await fetch(`${BASE_URL}/songs/${approvedSongId}/comments`);
    const j23 = await r23.json();
    assert(j23.data && j23.data.comments && j23.data.comments.length === 1, '1 comment remains after admin deletion');

    // 24. Author deletes own comment -> 200
    const r24 = await fetch(`${BASE_URL}/comments/${comment1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(r24.status === 200, 'Author deletes own comment with 200');

    // 25. Discussion empty
    const r25 = await fetch(`${BASE_URL}/songs/${approvedSongId}/comments`);
    const j25 = await r25.json();
    assert(j25.data && j25.data.comments && j25.data.comments.length === 0, 'Discussion is empty after all deletions');

    // 26. DELETE non-existent -> 404
    const r26 = await fetch(`${BASE_URL}/comments/99999999`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(r26.status === 404, 'DELETE non-existent comment returns 404');

    // 27. GET comments on pending song -> 404
    const r27 = await fetch(`${BASE_URL}/songs/${pendingSongId}/comments`);
    assert(r27.status === 404, 'GET comments on pending song returns 404');

  } catch (err) {
    console.error('Unexpected test runner error:', err.message);
    failed++;
  } finally {
    try {
      if (approvedSongId) await pool.query('DELETE FROM songs WHERE id IN (?, ?)', [approvedSongId, pendingSongId || 0]);
      if (artistProfileId) await pool.query('DELETE FROM artists WHERE id = ?', [artistProfileId]);
      await pool.query('DELETE FROM users WHERE email IN (?, ?, ?)', [emailA, emailB, artistEmail]);
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr.message);
    }
    await pool.end();
  }

  console.log(`\nPHASE 9 RESULTS: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();

