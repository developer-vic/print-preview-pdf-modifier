#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Print Preview PDF Modifier...\n');

// Function to start a service
function startService(name, command, args, cwd) {
  console.log(`📦 Starting ${name}...`);
  
  const process = spawn(command, args, {
    cwd: cwd,
    stdio: 'inherit',
    shell: true
  });

  process.on('error', (error) => {
    console.error(`❌ Error starting ${name}:`, error.message);
  });

  process.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ ${name} exited with code ${code}`);
    }
  });

  return process;
}

// Start backend
const backendProcess = startService(
  'Backend Server',
  'node',
  ['server.js'],
  path.join(__dirname, 'backend')
);

// Start frontend
const frontendProcess = startService(
  'Frontend Automation',
  'node',
  ['index.js'],
  path.join(__dirname, 'frontend')
);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down services...');
  
  backendProcess.kill('SIGINT');
  frontendProcess.kill('SIGINT');
  
  setTimeout(() => {
    console.log('✅ All services stopped');
    process.exit(0);
  }, 2000);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down services...');
  
  backendProcess.kill('SIGTERM');
  frontendProcess.kill('SIGTERM');
  
  setTimeout(() => {
    console.log('✅ All services stopped');
    process.exit(0);
  }, 2000);
});

// Keep the main process alive
process.stdin.resume();
