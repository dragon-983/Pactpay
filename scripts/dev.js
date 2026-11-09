import { spawn } from 'child_process';

const env = {
  ...process.env,
  PATH: `/home/acknowlege/.nvm/versions/node/v22.23.4/bin:${process.env.PATH || ''}`,
  PORT: '3002',
};

const api = spawn('npm', ['run', 'dev', '-w', 'server'], {
  stdio: 'inherit',
  shell: true,
  env,
});

const web = spawn('npm', ['run', 'dev', '-w', 'client'], {
  stdio: 'inherit',
  shell: true,
  env,
});

function cleanup() {
  api.kill();
  web.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

