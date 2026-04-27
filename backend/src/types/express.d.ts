/**
 * Express Request type augmentation.
 * Adds `user` property set by the auth middleware.
 */

declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
    };
  }
}
