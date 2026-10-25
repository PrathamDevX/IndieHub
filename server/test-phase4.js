const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== PHASE 4 AUTOMATED TEST SUITE ===');
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
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    assert(health.database === 'connected', 'Health check connected to database');

    // 2. Register/login test artist
    const testEmail = `artist_${Date.now()}@test.com`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Artist Demo',
        email: testEmail,
        password: 'password123',
        role: 'artist',
      }),
    });
    const regData = await regRes.json();
    const artistToken = regData.data?.token;
    assert(!!artistToken, 'Artist registration succeeded and returned JWT');

    // 3. Test upload without audio file (should fail with 422)
    const formWithoutAudio = new FormData();
    formWithoutAudio.append('title', 'No Audio Track');
    const noAudioRes = await fetch(`${BASE_URL}/songs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${artistToken}` },
      body: formWithoutAudio,
    });
    assert(noAudioRes.status === 422, 'Upload without audio rejected with 422');

    // 4. Test upload with invalid audio file type (.txt)
    const formInvalidAudio = new FormData();
    const textBlob = new Blob(['not an audio file'], { type: 'text/plain' });
    formInvalidAudio.append('audio', textBlob, 'test.txt');
    formInvalidAudio.append('title', 'Invalid Format Track');
    const invalidTypeRes = await fetch(`${BASE_URL}/songs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${artistToken}` },
      body: formInvalidAudio,
    });
    assert(invalidTypeRes.status === 422, 'Invalid file type rejected with 422');

    // 5. Successful upload with valid audio (.mp3) + cover (.jpg)
    const audioBlob = new Blob([new Uint8Array([0xFF, 0xFB, 0x90, 0x44, 0x00, 0x00])], { type: 'audio/mpeg' });
    const imageBlob = new Blob([new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46])], { type: 'image/jpeg' });

    const uploadForm = new FormData();
    uploadForm.append('audio', audioBlob, 'sample_audio.mp3');
    uploadForm.append('cover', imageBlob, 'cover.jpg');
    uploadForm.append('title', 'Midnight Frequency');
    uploadForm.append('description', 'An indie synth-wave experiment');
    uploadForm.append('genre', 'Electronic');

    const uploadRes = await fetch(`${BASE_URL}/songs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${artistToken}` },
      body: uploadForm,
    });
    const uploadData = await uploadRes.json();

    assert(uploadRes.status === 201, 'Song uploaded with 201 Created');
    assert(uploadData.data?.status === 'pending', 'Song initial status is "pending" (not approved)');
    const songId = uploadData.data?.songId;
    assert(!!songId, `Song ID received: ${songId}`);

    // 6. Test Static file serving and MySQL values
    const { pool } = require('./config/database');
    const [songRows] = await pool.execute('SELECT * FROM songs WHERE id = ?', [songId]);
    assert(songRows.length === 1, 'Song found in MySQL database');
    const song = songRows[0];
    assert(song.status === 'pending', 'DB status column is "pending"');
    assert(song.audio_url.startsWith('/uploads/songs/'), `Audio URL stored correctly: ${song.audio_url}`);
    assert(song.cover_image.startsWith('/uploads/covers/'), `Cover URL stored correctly: ${song.cover_image}`);

    // Fetch via HTTP GET from Express static server
    const audioStaticRes = await fetch(`http://localhost:5000${song.audio_url}`);
    assert(audioStaticRes.status === 200, `Audio file served statically from http://localhost:5000${song.audio_url}`);

    const coverStaticRes = await fetch(`http://localhost:5000${song.cover_image}`);
    assert(coverStaticRes.status === 200, `Cover file served statically from http://localhost:5000${song.cover_image}`);

    // 7. Verify pending song is NOT returned in public song list
    const publicSongsRes = await fetch(`${BASE_URL}/songs`);
    const publicSongs = await publicSongsRes.json();
    const foundPending = publicSongs.data?.songs.some((s) => s.id === songId);
    assert(!foundPending, 'Pending song is NOT exposed in public /api/songs list (moderation preserved)');

    // 8. Test Profile image upload via PUT /api/auth/profile
    const profileForm = new FormData();
    profileForm.append('name', 'Test Artist Updated');
    profileForm.append('bio', 'Making tunes with guitars and synths.');
    profileForm.append('image', imageBlob, 'avatar.jpg');

    const profileRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${artistToken}` },
      body: profileForm,
    });
    const profileData = await profileRes.json();
    assert(profileRes.status === 200, 'Profile update with avatar returned 200');
    assert(profileData.data?.user?.profileImage?.startsWith('/uploads/profiles/'), `Profile image URL stored: ${profileData.data?.user?.profileImage}`);

    const profileImgStatic = await fetch(`http://localhost:5000${profileData.data?.user?.profileImage}`);
    assert(profileImgStatic.status === 200, 'Profile image served statically');

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  }
}

runTests();
