const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    role: { type: String, enum: ['USER', 'MODERATOR', 'ADMIN'], default: 'USER' },
    status: { type: String, enum: ['ACTIVE', 'MUTED', 'BANNED', 'WARNING'], default: 'ACTIVE' },
    spamCount: { type: Number, default: 0 },
    toxicCount: { type: Number, default: 0 },
    violationScore: { type: Number, default: 0 },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' },
    isDeleted: { type: Boolean, default: false },
    deleted_at: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
