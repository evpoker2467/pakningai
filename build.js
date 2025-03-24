// Simple build script to replace environment variables in env-config.js
const fs = require('fs');
const path = require('path');

// Read the environment variables we want to inject
const API_KEY = process.env.API_KEY || '';

// Read the env-config.js file
const envConfigPath = path.join(__dirname, 'env-config.js');
let envConfigContent = fs.readFileSync(envConfigPath, 'utf8');

// Replace the placeholders with actual values
envConfigContent = envConfigContent.replace(
  'NETLIFY_ENV_API_KEY_PLACEHOLDER',
  API_KEY
);

// Write the updated content back to the file
fs.writeFileSync(envConfigPath, envConfigContent);

console.log('Environment variables injected into env-config.js'); 