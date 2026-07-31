const BASE_AUTHOR_POPULATE = { path: 'author', select: 'username avatar' };
const ADMIN_AUTHOR_POPULATE = { path: 'author', select: 'username email avatar' };
const BASE_SENDER_POPULATE = { path: 'sender', select: 'username avatar' };
const BASE_RECIPIENT_POPULATE = { path: 'recipient', select: 'username avatar' };
const BASE_REPORTER_POPULATE = { path: 'reporter_id', select: 'username email' };
const BASE_USER_POPULATE = { path: 'user_id', select: 'username email avatar' };
const BASE_FOLLOW_POPULATE = { path: 'follower_id', select: 'username avatar bio' };
const BASE_FOLLOWING_POPULATE = { path: 'following_id', select: 'username avatar bio' };

function getAuthorPopulate(isAdmin = false) {
  return isAdmin ? ADMIN_AUTHOR_POPULATE : BASE_AUTHOR_POPULATE;
}

function getOriginalPostPopulate(isAdmin = false) {
  return {
    path: 'original_post',
    populate: getAuthorPopulate(isAdmin)
  };
}

function getSenderPopulate() {
  return BASE_SENDER_POPULATE;
}

function getReporterPopulate() {
  return BASE_REPORTER_POPULATE;
}

function getUserPopulate() {
  return BASE_USER_POPULATE;
}

module.exports = {
  BASE_AUTHOR_POPULATE,
  ADMIN_AUTHOR_POPULATE,
  BASE_SENDER_POPULATE,
  BASE_RECIPIENT_POPULATE,
  BASE_REPORTER_POPULATE,
  BASE_USER_POPULATE,
  BASE_FOLLOW_POPULATE,
  BASE_FOLLOWING_POPULATE,
  getAuthorPopulate,
  getOriginalPostPopulate,
  getSenderPopulate,
  getReporterPopulate,
  getUserPopulate
};