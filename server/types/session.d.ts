import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    username?: string;
    isAdmin?: boolean;
    isAuthenticated?: boolean;
  }
}