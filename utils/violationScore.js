const VIOLATION_WEIGHTS = {
  SPAM: 1,
  TOXIC: 3,
  AI_UNAVAILABLE: 0
};

const STATUS_THRESHOLDS = {
  WARNING: 5,
  BANNED: 10
};

function calculateViolationScore(spamCount, toxicCount) {
  return (spamCount * VIOLATION_WEIGHTS.SPAM) + (toxicCount * VIOLATION_WEIGHTS.TOXIC);
}

function getStatusFromScore(violationScore, currentStatus = 'ACTIVE') {
  if (currentStatus === 'BANNED') return 'BANNED';
  
  if (violationScore >= STATUS_THRESHOLDS.BANNED) return 'BANNED';
  if (violationScore >= STATUS_THRESHOLDS.WARNING) return 'WARNING';
  
  return currentStatus;
}

function getViolationDeltas(label) {
  return {
    spamDelta: label === 'SPAM' ? 1 : 0,
    toxicDelta: label === 'TOXIC' ? 1 : 0
  };
}

function getScoreIncrement(label) {
  return VIOLATION_WEIGHTS[label] || 0;
}

function isViolationLabel(label) {
  return label === 'SPAM' || label === 'TOXIC';
}

module.exports = {
  VIOLATION_WEIGHTS,
  STATUS_THRESHOLDS,
  calculateViolationScore,
  getStatusFromScore,
  getViolationDeltas,
  getScoreIncrement,
  isViolationLabel
};