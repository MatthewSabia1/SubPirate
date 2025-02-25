/**
 * Setup local development environment for Clerk authentication
 * 
 * This script:
 * 1. Adds instructions for setting up a Clerk development environment
 * 2. Provides a guide for configuring localhost in Clerk dashboard
 * 
 * Run with: node setup-local-env.js
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('\n==== Clerk Local Development Setup Guide ====\n');

console.log('To fix the domain restriction error, follow these steps:');
console.log('\n1. Log in to your Clerk Dashboard: https://dashboard.clerk.com/');
console.log('2. Select your application');
console.log('3. Go to "Settings" > "Domains"');
console.log('4. Add "localhost:5173" as a development domain');
console.log('5. Make sure to select it as a development domain, not production');
console.log('6. Save your changes');
console.log('\nAlternatively:');
console.log('1. Create a separate development application in Clerk');
console.log('2. Use the development publishable key in your .env file');
console.log('3. Allow localhost:5173 in the development application\n');

console.log('Current domain configuration in your app:');

// Get publishable key from environment variables
const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY;

if (publishableKey) {
  console.log(`Publishable Key: ${publishableKey.substring(0, 12)}...`);
  
  try {
    // Try to decode domain from key if it's domain-encoded
    if (publishableKey.startsWith('pk_live_')) {
      const base64Part = publishableKey.slice(8);
      try {
        const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
        if (decoded.includes('.')) {
          console.log(`\nDetected domain from key: ${decoded}`);
          console.log('This key is restricted to this domain.');
          console.log('You need to add localhost:5173 as an allowed domain in Clerk dashboard.');
        }
      } catch (e) {
        console.log('Could not decode domain from key.');
      }
    }
  } catch (e) {
    console.log('Error analyzing key:', e.message);
  }
} else {
  console.log('Publishable key not found in environment variables');
  
  // Try to read directly from .env file
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const publishableKeyLine = envContent.split('\n').find(line => 
      line.trim().startsWith('VITE_CLERK_PUBLISHABLE_KEY=')
    );
    
    if (publishableKeyLine) {
      const keyFromFile = publishableKeyLine.split('=')[1].trim();
      console.log(`Found key in .env file: ${keyFromFile.substring(0, 12)}...`);
    } else {
      console.log('Publishable key not found in .env file');
    }
  } catch (e) {
    console.log('Could not read .env file:', e.message);
  }
}

console.log('\n===========================================\n');
console.log('After updating your Clerk configuration, restart your development server.'); 