/**  
 * Centralised API configuration.  
 *   
 * Uses the VITE_API_URL environment variable set by Docker Compose  
 * (or .env in local dev) with a sensible fallback.  
 *   
 * For reverse proxy deployments (full-sim mode), use relative path /api  
 * For direct API access (split mode), use full URL  
 */  
export const API_BASE_URL: string =  
  import.meta.env.VITE_API_URL || '/api';  
  
/**  
 * Derive the WebSocket base URL from the HTTP one.  
 * Handles both http→ws and https→wss.  
 * For relative paths, construct WebSocket URL from current location.  
 */  
export const WS_BASE_URL: string = (() => {  
  const baseUrl = API_BASE_URL;  
  // If it's a relative path, construct WebSocket URL from current origin  
  if (!baseUrl.startsWith('http')) {  
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';  
    const host = window.location.host;  
    return `${protocol}//${host}${baseUrl}`;  
  }  
  return baseUrl.replace(/^http/, 'ws');  
})();