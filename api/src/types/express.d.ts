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
        profileUserId?: string | null;
        organizationId?: string | null;
        clerkUserId?: string;
        role?: string;
        isPending?: boolean;
      };
      user?: {
        clerkId: string;
        role: string;
        id: string | null;
        isPending?: boolean;
      };
    }
  }
}

export {};