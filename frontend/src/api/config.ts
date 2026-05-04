/**
 * Centralised API configuration.
 * 
 * Uses the VITE_API_URL environment variable set by Docker Compose
 * (or .env in local dev) with a sensible localhost fallback.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Derive the WebSocket base URL from the HTTP one.
 * Handles both http→ws and https→wss.
 */
export const WS_BASE_URL: string =
  API_BASE_URL.replace(/^http/, 'ws');
