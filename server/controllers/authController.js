const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status || 'active',
    profileImage: user.profile_image || null,
    bio: user.bio || null,
    createdAt: user.created_at,
  };
}

function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });
}

function sendValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
    return true;
  }
  return false;
}

async function register(req, res, next) {
  if (sendValidationErrors(req, res)) return;

  const { name, email, password, role } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [existingUsers] = await connection.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email.toLowerCase()],
    );
    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await connection.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.toLowerCase(), passwordHash, role],
    );

    if (role === 'artist') {
      await connection.execute(
        'INSERT INTO artists (user_id, artist_name) VALUES (?, ?)',
        [result.insertId, name.trim()],
      );
    }

    await connection.commit();
    const user = { id: result.insertId, name: name.trim(), email: email.toLowerCase(), role };
    return res.status(201).json({
      success: true,
      message: 'Your IndieHub account has been created.',
      data: { token: createToken(user), user: publicUser(user) },
    });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
}

async function login(req, res, next) {
  if (sendValidationErrors(req, res)) return;

  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, password, role, status, profile_image, bio, created_at FROM users WHERE email = ? LIMIT 1',
      [req.body.email.toLowerCase()],
    );
    const user = users[0];
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
      return res.status(401).json({ success: false, message: 'The email or password is incorrect.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact support.' });
    }

    return res.json({
      success: true,
      message: 'Welcome back to IndieHub.',
      data: { token: createToken(user), user: publicUser(user) },
    });
  } catch (error) {
    return next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, role, profile_image, bio, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id],
    );
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }
    return res.json({ success: true, data: { user: publicUser(users[0]) } });
  } catch (error) {
    return next(error);
  }
}

async function updateProfile(req, res, next) {
  if (sendValidationErrors(req, res)) return;
  try {
    const profileImage = req.file ? `/uploads/profiles/${req.file.filename}` : undefined;
    const [users] = await pool.execute('SELECT id, name, bio, profile_image, role FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });

    const current = users[0];
    const newName = req.body.name !== undefined ? req.body.name.trim() : current.name;
    const newBio = req.body.bio !== undefined ? req.body.bio : current.bio;
    const newImage = profileImage !== undefined ? profileImage : current.profile_image;

    await pool.execute(
      'UPDATE users SET name = ?, bio = ?, profile_image = ? WHERE id = ?',
      [newName, newBio, newImage, req.user.id],
    );

    if (current.role === 'artist' && profileImage) {
      await pool.execute('UPDATE artists SET profile_image = ? WHERE user_id = ?', [profileImage, req.user.id]);
    }

    const [updated] = await pool.execute(
      'SELECT id, name, email, role, profile_image, bio, created_at FROM users WHERE id = ?',
      [req.user.id],
    );

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user: publicUser(updated[0]) },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { register, login, getMe, updateProfile };

