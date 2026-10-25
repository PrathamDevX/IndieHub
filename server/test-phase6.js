const { pool } = require('./config/database');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== PHASE 6 AUTOMATED TEST SUITE ===');
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
    // 1. Unauthenticated requests blocked
    const unauthLike = await fetch(`${BASE_URL}/songs/1/like`, { method: 'POST' });
    assert(unauthLike.status === 401, 'Unauthenticated POST /api/songs/:id/like returns 401');

    const unauthFollow = await fetch(`${BASE_URL}/artists/1/follow`, { method: 'POST' });
    assert(unauthFollow.status === 401, 'Unauthenticated POST /api/artists/:id/follow returns 401');

    // 2. Register two test users: Artist A and Listener B
    const artistEmail = `phase6_artist_${Date.now()}@test.com`;
    const regArtist = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Phase6 Artist',
        email: artistEmail,
        password: 'password123',
        role: 'artist',
      }),
    });
    const artistToken = (await regArtist.json()).data.token;

    // Get Artist ID
    const [artists] = await pool.execute('SELECT id, user_id FROM artists WHERE user_id = (SELECT id FROM users WHERE email = ?)', [artistEmail]);
    const artistId = artists[0].id;

    const listenerEmail = `phase6_listener_${Date.now()}@test.com`;
    const regListener = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Phase6 Listener',
        email: listenerEmail,
        password: 'password123',
        role: 'listener',
      }),
    });
    const listenerToken = (await regListener.json()).data.token;

    // 3. Artist self-follow check (cannot follow own profile)
    const selfFollow = await fetch(`${BASE_URL}/artists/${artistId}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${artistToken}` },
    });
    assert(selfFollow.status === 400, 'Artist cannot follow their own profile (returns 400)');

    // 4. Create and approve a song for Artist A
    const audioBlob = new Blob([new Uint8Array([0xFF, 0xFB, 0x90, 0x44, 0x00, 0x00])], { type: 'audio/mpeg' });
    const uploadForm = new FormData();
    uploadForm.append('audio', audioBlob, 'p6_track.mp3');
    uploadForm.append('title', 'Phase6 Test Melody');
    uploadForm.append('genre', 'Dream Pop');

    const uploadRes = await fetch(`${BASE_URL}/songs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${artistToken}` },
      body: uploadForm,
    });
    const songId = (await uploadRes.json()).data.songId;

    // Admin approves the song
    await pool.execute('UPDATE songs SET status = "approved" WHERE id = ?', [songId]);

    // 5. Listener likes the song
    const likeRes = await fetch(`${BASE_URL}/songs/${songId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${listenerToken}` },
    });
    const likeData = await likeRes.json();
    assert(likeRes.status === 200, 'POST /api/songs/:id/like returned 200');
    assert(likeData.data.liked === true, 'Response confirms liked: true');
    assert(likeData.data.likeCount === 1, 'Like count incremented to 1');

    // 6. Duplicate like prevention
    const dupLikeRes = await fetch(`${BASE_URL}/songs/${songId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${listenerToken}` },
    });
    const dupLikeData = await dupLikeRes.json();
    assert(dupLikeRes.status === 200 && dupLikeData.data.likeCount === 1, 'Duplicate like prevented without error (count stays 1)');

    // 7. GET /api/songs/liked
    const likedSongsRes = await fetch(`${BASE_URL}/songs/liked`, {
      headers: { Authorization: `Bearer ${listenerToken}` },
    });
    const likedSongsData = await likedSongsRes.json();
    assert(likedSongsRes.status === 200, 'GET /api/songs/liked returned 200');
    assert(likedSongsData.data.songs.some((s) => s.id === songId), 'Liked song appears in user liked songs list');

    // 8. Personalized public GET /api/songs with optionalAuth
    const publicSongsWithAuth = await fetch(`${BASE_URL}/songs`, {
      headers: { Authorization: `Bearer ${listenerToken}` },
    });
    const publicSongsData = await publicSongsWithAuth.json();
    const songInFeed = publicSongsData.data.songs.find((s) => s.id === songId);
    assert(songInFeed && songInFeed.isLiked === true, 'Public /api/songs includes personalized isLiked: true for logged-in user');

    // 9. Listener unlikes song
    const unlikeRes = await fetch(`${BASE_URL}/songs/${songId}/like`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${listenerToken}` },
    });
    const unlikeData = await unlikeRes.json();
    assert(unlikeRes.status === 200, 'DELETE /api/songs/:id/like returned 200');
    assert(unlikeData.data.liked === false, 'Response confirms liked: false');
    assert(unlikeData.data.likeCount === 0, 'Like count decremented to 0');

    // Verify removed from GET /api/songs/liked
    const likedAfterUnlike = await fetch(`${BASE_URL}/songs/liked`, {
      headers: { Authorization: `Bearer ${listenerToken}` },
    });
    const likedAfterData = await likedAfterUnlike.json();
    assert(!likedAfterData.data.songs.some((s) => s.id === songId), 'Song successfully removed from liked songs list');

    // 10. Listener follows Artist A
    const followRes = await fetch(`${BASE_URL}/artists/${artistId}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${listenerToken}` },
    });
    const followData = await followRes.json();
    assert(followRes.status === 200, 'POST /api/artists/:id/follow returned 200');
    assert(followData.data.following === true, 'Response confirms following: true');
    assert(followData.data.followerCount === 1, 'Follower count incremented to 1');

    // 11. Duplicate follow prevention
    const dupFollowRes = await fetch(`${BASE_URL}/artists/${artistId}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${listenerToken}` },
    });
    const dupFollowData = await dupFollowRes.json();
    assert(dupFollowRes.status === 200 && dupFollowData.data.followerCount === 1, 'Duplicate follow prevented (follower count stays 1)');

    // 12. GET /api/artists/followed
    const followedRes = await fetch(`${BASE_URL}/artists/followed`, {
      headers: { Authorization: `Bearer ${listenerToken}` },
    });
    const followedData = await followedRes.json();
    assert(followedRes.status === 200, 'GET /api/artists/followed returned 200');
    assert(followedData.data.artists.some((a) => a.id === artistId), 'Followed artist appears in followed artists list');

    // 13. Personalized GET /api/artists/:id with optionalAuth
    const artistProfileWithAuth = await fetch(`${BASE_URL}/artists/${artistId}`, {
      headers: { Authorization: `Bearer ${listenerToken}` },
    });
    const artistProfileData = await artistProfileWithAuth.json();
    assert(artistProfileData.data.artist.isFollowing === true, 'Artist profile includes isFollowing: true');

    // 14. Listener unfollows Artist A
    const unfollowRes = await fetch(`${BASE_URL}/artists/${artistId}/follow`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${listenerToken}` },
    });
    const unfollowData = await unfollowRes.json();
    assert(unfollowRes.status === 200, 'DELETE /api/artists/:id/follow returned 200');
    assert(unfollowData.data.following === false, 'Response confirms following: false');
    assert(unfollowData.data.followerCount === 0, 'Follower count decremented to 0');

    // 15. Verify removed from GET /api/artists/followed
    const followedAfterUnfollow = await fetch(`${BASE_URL}/artists/followed`, {
      headers: { Authorization: `Bearer ${listenerToken}` },
    });
    const followedAfterData = await followedAfterUnfollow.json();
    assert(!followedAfterData.data.artists.some((a) => a.id === artistId), 'Artist successfully removed from followed list');

    // Clean up test records
    await pool.execute('DELETE FROM users WHERE email IN (?, ?)', [artistEmail, listenerEmail]);

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
