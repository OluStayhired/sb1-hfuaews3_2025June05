import { BskyAgent } from '@atproto/api';
import { AUTH_CONFIG } from './constants';

const debugLog = (message: string, data?: any) => {
  console.log(`[BlueSky Auth] ${message}`, data || '');
};

export const createAgent = (): BskyAgent => {
  try {
    debugLog('Creating new BskyAgent instance');
    return new BskyAgent({
      service: AUTH_CONFIG.SERVICE_URL
    });
  } catch (error) {
    debugLog('Error creating BskyAgent instance', error);
    throw new Error('Failed to initialize BlueSky client');
  }
};

export const validateIdentifier = (identifier: string): string => {
  try {
    const validIdentifier = identifier.trim().replace(/^@+/, '');
    
    if (!AUTH_CONFIG.HANDLE_REGEX.test(validIdentifier)) {
      throw new Error('Invalid handle format. Expected format: handle.bsky.social');
    }
    
    return validIdentifier;
  } catch (error) {
    debugLog('Error validating identifier', error);
    throw error;
  }
};

Object.freeze(createAgent);
Object.freeze(validateIdentifier);