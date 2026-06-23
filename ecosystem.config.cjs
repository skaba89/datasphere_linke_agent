// PM2 ecosystem - optionnel (Render gère le process lui-même)
// Usage local: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'datasphere',
    script: '.next/standalone/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 10000,
      HOSTNAME: '0.0.0.0',
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '512M',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
  }],
}
