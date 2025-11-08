// Optional development server configuration
// This file can be used for advanced WebSocket and dev server configurations

module.exports = {
  // WebSocket configuration
  webSocketServer: {
    type: 'ws', // or 'sockjs'
    options: {
      host: 'localhost',
      port: 4200,
    }
  },
  
  // Live reload configuration
  liveReload: true,
  
  // Hot Module Replacement
  hot: false, // Set to true if you want HMR
  
  // Additional dev server options
  devMiddleware: {
    publicPath: '/',
  },
  
  // CORS configuration if needed
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
  }
};