// Configuration for different environments
const config = {
  development: {
    API_BASE: 'http://localhost:5001/api',
    SOCKET_URL: 'http://localhost:5001'
  },
  production: {
    API_BASE: 'https://lgt-2.onrender.com/api',
    SOCKET_URL: 'https://lgt-2.onrender.com'
  }
};

// Determine current environment
// Only treat true localhost as development — ngrok/deployed URLs use production backend
const isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';

const environment = isLocalhost ? 'development' : 'production';

console.log('🌍 Environment detected:', environment);
console.log('🔗 Current hostname:', window.location.hostname);
console.log('📡 API Base:', config[environment].API_BASE);
console.log('🔌 Socket URL:', config[environment].SOCKET_URL);

// Export current configuration
export const API_BASE = config[environment].API_BASE;
export const SOCKET_URL = config[environment].SOCKET_URL;

export default config[environment];