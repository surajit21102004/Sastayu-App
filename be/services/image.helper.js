/**
 * Image URL normalization helper
 * Resolves static uploads to the active request host and cleans local client file URIs
 */
const os = require('os');

function getFallbackHost() {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          if (net.address.startsWith('192.168.') || name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wifi')) {
            return `${net.address}:5000`;
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return '192.168.0.102:5000';
}

function formatWorkerPhoto(url, req) {
  if (!url) return null;
  const str = String(url).trim();
  
  // Exclude client-local sandbox URIs (file:///data/user/0/...)
  if (str.startsWith('file:///')) return null;

  const fallback = getFallbackHost();

  // Resolve relative /uploads path with current server host
  if (str.startsWith('/uploads/')) {
    const host = (req && req.get) ? req.get('host') : fallback;
    const proto = req ? req.protocol : 'http';
    return `${proto}://${host || fallback}${str}`;
  }

  // If stored as absolute URL with /uploads/... rewrite to current active host
  const match = str.match(/\/uploads\/[^\s'"]+$/);
  if (match && req) {
    const host = req.get('host') || fallback;
    return `${req.protocol}://${host}${match[0]}`;
  }

  return str;
}

module.exports = {
  formatWorkerPhoto,
};
