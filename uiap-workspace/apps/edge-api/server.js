/**
 * Phusion Passenger (cPanel) Entry Point
 * 
 * cPanel's Node.js application manager typically looks for an app.js or server.js
 * at the root of the application directory.
 * 
 * This file simply proxies the execution to the compiled TypeScript output.
 */
import dotenv from 'dotenv';
dotenv.config();

// Passenger automatically injects the PORT environment variable
const port = process.env.PORT || 3000;
process.env.PORT = port.toString();

// Start the compiled application
import('./dist/index.js');
