declare global {
  namespace Express {
    interface Request {
      id: string;
      clerk?: {
        userId: string;
      };
      context?: {
        userId: string;
        appUserId: string;
        clerkUserId?: string;
        role?: string;
      };
    }
  }
}

export {};