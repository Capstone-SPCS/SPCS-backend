module.exports = {
  apps: [{
    name: 'express-server',
    script: './dist/index.js',
    watch: true,
    ignore_watch: ['node_modules'],
    instances: 1,
    autorestart: true,
    max_memory_restart: '1G',
    env_development: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};