module.exports = {
  apps: [
    {
      name: 'schedule-api',
      cwd: './schedule-api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 9020
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 9020
      },
      log_file: './logs/schedule-api.log',
      error_file: './logs/schedule-api-error.log',
      out_file: './logs/schedule-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};