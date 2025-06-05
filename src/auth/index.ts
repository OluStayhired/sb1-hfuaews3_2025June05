import { useAuthStore } from './store';
import { AUTH_CONFIG } from './constants';
import type { AuthUser, AuthState, AuthActions } from './types';

export { useAuthStore, AUTH_CONFIG };
export type { AuthUser, AuthState, AuthActions };

// Make the exports immutable using Object.freeze on individual exports
Object.freeze(useAuthStore);
Object.freeze(AUTH_CONFIG);