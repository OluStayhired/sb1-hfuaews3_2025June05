import { BskyAgent } from '@atproto/api';

export interface AuthUser {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export interface AuthState {
  readonly agent: BskyAgent | null;
  readonly isAuthenticated: boolean;
  readonly user: AuthUser | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

export interface AuthActions {
  readonly login: (identifier: string, password: string) => Promise<void>;
  readonly logout: () => void;
  readonly clearError: () => void;
}