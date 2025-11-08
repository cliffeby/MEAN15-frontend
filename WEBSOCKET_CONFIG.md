# WebSocket Development Server Configuration

## Angular Development Server WebSocket Support

The Angular development server uses WebSockets for live reload functionality. This configuration ensures WebSocket support is properly enabled.

## Configuration Made

### 1. Updated angular.json
- Added explicit `liveReload: true` configuration
- Set host to `localhost` and port to `4200`
- Disabled HMR (Hot Module Replacement) to avoid conflicts

### 2. Updated package.json
- Added `dev` script with explicit WebSocket flags
- Added `dev-ws` script with verbose logging for debugging

## Usage

### Basic Development Server
```bash
npm run dev
```

### Development Server with Verbose Logging
```bash
npm run dev-ws
```

### Manual Command
```bash
ng serve --configuration development --live-reload --host localhost --port 4200
```

## Troubleshooting WebSocket Issues

### Common Issues and Solutions

1. **Port Already in Use**
   ```bash
   ng serve --port 4201
   ```

2. **WebSocket Connection Failed**
   - Check firewall settings
   - Ensure localhost is accessible
   - Try different port: `ng serve --port 4201`

3. **Live Reload Not Working**
   ```bash
   ng serve --live-reload --poll 2000
   ```

4. **Network Access Issues**
   ```bash
   ng serve --host 0.0.0.0 --disable-host-check
   ```

### Advanced Configuration

If you need more control over WebSocket configuration, you can use the `dev-server.config.js` file for custom webpack dev server settings.

### Browser Support

WebSocket support is available in all modern browsers. If you're using an older browser, the dev server will fall back to polling.

## Verification

To verify WebSocket is working:
1. Start the dev server: `npm run dev`
2. Open browser dev tools
3. Check Network tab for WebSocket connections
4. Look for connections to `ws://localhost:4200/ws`

## Additional Notes

- The development server automatically enables WebSocket by default in Angular 15+
- Live reload uses WebSocket for fast change detection
- Hot Module Replacement (HMR) is disabled to prevent conflicts
- CORS headers are configured for cross-origin requests if needed