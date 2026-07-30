const requiredEnvVars = [
  'MONGO_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'AI_SERVICE_URL',
  'CLIENT_URL',
  'PORT'
];

function validateEnv() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease check your .env file or environment configuration.');
    process.exit(1);
  }

  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (accessSecret === refreshSecret) {
    console.error('❌ JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values');
    process.exit(1);
  }

  if (accessSecret.length < 32 || refreshSecret.length < 32) {
    console.error('❌ JWT secrets must be at least 32 characters long');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
  console.log(`   JWT_ACCESS_SECRET: ${maskSecret(accessSecret)}`);
  console.log(`   JWT_REFRESH_SECRET: ${maskSecret(refreshSecret)}`);
  console.log(`   MONGO_URI: ${maskUri(process.env.MONGO_URI)}`);
  console.log(`   AI_SERVICE_URL: ${process.env.AI_SERVICE_URL}`);
  console.log(`   CLIENT_URL: ${process.env.CLIENT_URL}`);
  console.log(`   PORT: ${process.env.PORT}`);
}

function maskSecret(secret) {
  if (!secret) return 'NOT_SET';
  return secret.slice(0, 4) + '*'.repeat(Math.max(0, secret.length - 8)) + secret.slice(-4);
}

function maskUri(uri) {
  if (!uri) return 'NOT_SET';
  try {
    const url = new URL(uri);
    return `${url.protocol}//${url.hostname}:${url.port || ''}`;
  } catch {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  }
}

module.exports = { validateEnv, requiredEnvVars };