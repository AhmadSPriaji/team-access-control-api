export interface JwtUserPayload {
  userId: string;
  email: string;
  organizationId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}
