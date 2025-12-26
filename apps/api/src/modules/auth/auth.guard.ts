import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { auth } from "../../lib/auth";
import type { Request } from "express";

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const session = await auth.api.getSession({
      headers: request.headers as unknown as Headers,
    });

    if (!session) {
      throw new UnauthorizedException("Authentication required");
    }

    // Attach session and user to request for later use
    (request as any).session = session.session;
    (request as any).user = session.user;

    return true;
  }
}
