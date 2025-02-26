// Chrome Extension Build Script
// This script reads environment variables and injects them into the extension files at build time

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.extension
const result = dotenv.config({ path: '.env.extension' });
if (result.error) {
  console.error('Error loading .env.extension file');
  console.error('Please create a .env.extension file based on .env.extension.example');
  process.exit(1);
}

// Environment variable validation
const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'APP_URL'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`Error: Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please add them to your .env.extension file');
  process.exit(1);
}

// Create the dist directory if it doesn't exist
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy all files from src to dist
copyDirectory(path.join(__dirname, 'src'), path.join(distDir, 'src'));

// Copy manifest.json
fs.copyFileSync(
  path.join(__dirname, 'manifest.json'),
  path.join(distDir, 'manifest.json')
);

// Update background.js with environment variables
let backgroundJsContent = fs.readFileSync(
  path.join(__dirname, 'src/background/background.js'),
  'utf8'
);

// Replace environment variable placeholders - make sure to add quotes for proper JavaScript string formatting
backgroundJsContent = backgroundJsContent
  .replace(
    /__SUPABASE_URL__/g,
    `'${process.env.VITE_SUPABASE_URL}'`
  )
  .replace(
    /__SUPABASE_KEY__/g,
    `'${process.env.VITE_SUPABASE_ANON_KEY}'`
  )
  .replace(
    /__APP_URL__/g,
    `'${process.env.APP_URL || 'http://localhost:5173'}'`
  );

// Write the updated background.js to the dist directory
fs.writeFileSync(
  path.join(distDir, 'src/background/background.js'),
  backgroundJsContent,
  'utf8'
);

console.log('Extension built successfully with environment variables!');
console.log(`Output directory: ${distDir}`);
console.log('You can now load the extension from the dist directory');

// Helper function to recursively copy a directory
function copyDirectory(source, destination) {
  // Create the destination directory if it doesn't exist
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  // Get all files in the source directory
  const entries = fs.readdirSync(source, { withFileTypes: true });

  // Copy each file/directory
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDirectory(sourcePath, destPath);
    } else {
      // Copy files
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}
