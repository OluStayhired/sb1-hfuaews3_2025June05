// Authentication configuration constants
export const AUTH_CONFIG = {
  SERVICE_URL: 'https://bsky.social',
  MIN_PASSWORD_LENGTH: 8,
  HANDLE_REGEX: /^[a-zA-Z0-9.-]+\.[a-zA-Z0-9.-]+$/,
} as const;