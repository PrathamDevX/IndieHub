const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// ---------- helpers ----------

const UPLOAD_ROOT = path.resolve(__dirname, '..', 'uploads');

const AUDIO_MIMETYPES = new Set([
  'audio/mpeg',        // .mp3
  'audio/wav',         // .wav
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',         // .ogg
  'audio/flac',        // .flac
  'audio/x-flac',
  'audio/aac',         // .aac
  'audio/mp4',         // .m4a
  'audio/x-m4a',
  'audio/webm',
]);

const IMAGE_MIMETYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_AUDIO_SIZE = 50 * 1024 * 1024;   // 50 MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;    // 5 MB

/**
 * Ensure a directory exists (sync — called once at startup-ish time).
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Make sure the three sub-folders exist.
['songs', 'covers', 'profiles'].forEach((sub) => ensureDir(path.join(UPLOAD_ROOT, sub)));

/**
 * Build a safe, unique filename: <timestamp>-<random hex>.<ext>
 */
function safeName(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const hex = crypto.randomBytes(8).toString('hex');
  return `${Date.now()}-${hex}${ext}`;
}

// ---------- storage ----------

function makeStorage(subFolder) {
  return multer.diskStorage({
    destination(_req, _file, cb) {
      const dest = path.join(UPLOAD_ROOT, subFolder);
      ensureDir(dest);
      cb(null, dest);
    },
    filename(_req, file, cb) {
      cb(null, safeName(file.originalname));
    },
  });
}

// ---------- file filters ----------

function audioFilter(_req, file, cb) {
  if (AUDIO_MIMETYPES.has(file.mimetype)) return cb(null, true);
  cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
}

function imageFilter(_req, file, cb) {
  if (IMAGE_MIMETYPES.has(file.mimetype)) return cb(null, true);
  cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
}

function songFilter(_req, file, cb) {
  if (file.fieldname === 'audio' && AUDIO_MIMETYPES.has(file.mimetype)) return cb(null, true);
  if (file.fieldname === 'cover' && IMAGE_MIMETYPES.has(file.mimetype)) return cb(null, true);
  cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
}

// ---------- multer instances ----------

/**
 * songUpload — accepts two fields:
 *   audio (required, max 50 MB)
 *   cover (optional, max 5 MB)
 * Audio goes to uploads/songs, cover goes to uploads/covers.
 */
const songUpload = multer({
  storage: multer.diskStorage({
    destination(_req, file, cb) {
      const sub = file.fieldname === 'audio' ? 'songs' : 'covers';
      const dest = path.join(UPLOAD_ROOT, sub);
      ensureDir(dest);
      cb(null, dest);
    },
    filename(_req, file, cb) {
      cb(null, safeName(file.originalname));
    },
  }),
  fileFilter: songFilter,
  limits: { fileSize: MAX_AUDIO_SIZE },   // largest allowed (audio); image checked separately
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

/**
 * profileUpload — single `image` field, max 5 MB, goes to uploads/profiles.
 */
const profileUpload = multer({
  storage: makeStorage('profiles'),
  fileFilter: imageFilter,
  limits: { fileSize: MAX_IMAGE_SIZE },
}).single('image');

/**
 * coverUpload — single `cover` field, max 5 MB, goes to uploads/covers.
 */
const coverUpload = multer({
  storage: makeStorage('covers'),
  fileFilter: imageFilter,
  limits: { fileSize: MAX_IMAGE_SIZE },
}).single('cover');

// ---------- error-handling wrapper ----------

/**
 * Wraps a multer middleware so that MulterErrors are turned into clean JSON responses
 * instead of crashing into the global error handler with an opaque message.
 */
function wrapMulter(mw) {
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        const messages = {
          LIMIT_FILE_SIZE: 'The uploaded file exceeds the maximum allowed size.',
          LIMIT_UNEXPECTED_FILE: 'Invalid file type. Please upload a supported format.',
          LIMIT_FILE_COUNT: 'Too many files uploaded.',
        };
        return res.status(422).json({
          success: false,
          message: messages[err.code] || err.message,
        });
      }
      return next(err);
    });
  };
}

module.exports = {
  songUpload: wrapMulter(songUpload),
  profileUpload: wrapMulter(profileUpload),
  coverUpload: wrapMulter(coverUpload),
};
