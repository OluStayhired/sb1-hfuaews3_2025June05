import { BskyAgent } from '@atproto/api';

const debugLog = (message: string, data?: any) => {
  console.log(`[BlueSky Auth] ${message}`, data || '');
};

export const createAgent = (): BskyAgent => {
  try {
    debugLog('Creating new BskyAgent instance');
    const agent = new BskyAgent({
      service: 'https://bsky.social'
    });
    return agent;
  } catch (error) {
    debugLog('Error creating BskyAgent instance', error);
    throw new Error('Failed to initialize BlueSky client');
  }
};

export const validateIdentifier = (identifier: string): string => {
  try {
    // Remove any leading/trailing whitespace
    let validIdentifier = identifier.trim();
    
    // Remove @ if it exists
    validIdentifier = validIdentifier.replace(/^@+/, '');
    
    // Validate basic handle format
    if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z0-9.-]+$/.test(validIdentifier)) {
      throw new Error('Invalid handle format. Expected format: handle.bsky.social');
    }
    
    return validIdentifier;
  } catch (error) {
    debugLog('Error validating identifier', error);
    throw error;
  }
};