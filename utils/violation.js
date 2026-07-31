const VIOLATION_WEIGHTS = {
  SPAM: 1,
  TOXIC: 3
};

const STATUS_THRESHOLDS = {
  BANNED: 10,
  WARNING: 5
};

function calculateViolationScore(spamCount, toxicCount) {
  return (spamCount * VIOLATION_WEIGHTS.SPAM) + (toxicCount * VIOLATION_WEIGHTS.TOXIC);
}

function getStatusFromScore(violationScore, currentStatus = 'ACTIVE') {
  if (currentStatus === 'BANNED') return 'BANNED';
  
  if (violationScore >= STATUS_THRESHOLDS.BANNED) return 'BANNED';
  if (violationScore >= STATUS_THRESHOLDS.WARNING) return 'WARNING';
  
  return 'ACTIVE';
}

function getDeltasFromLabel(label) {
  return {
    spamDelta: label === 'SPAM' ? 1 : 0,
    toxicDelta: label === 'TOXIC' ? 1 : 0
  };
}

function isViolationLabel(label) {
  return label === 'SPAM' || label === 'TOXIC';
}

module.exports = {
  VIOLATION_WEIGHTS,
  STATUS_THRESHOLDS,
  calculateViolationScore,
  getStatusFromScore,
  getDeltasFromLabel,
  isViolationLabel
};