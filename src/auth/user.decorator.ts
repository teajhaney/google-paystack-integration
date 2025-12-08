import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * User payload type from JWT token
 */
export interface UserPayload {
  userId: string;
  email: string;
}

/**
 * Request interface with user property
 */
interface RequestWithUser extends Request {
  user: UserPayload;
}

/**
 * Custom decorator to extract user from request
 * This extracts the user object that was set by the JWT strategy
 */
export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserPayload => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
