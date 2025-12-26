import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

export interface CurrentUserData {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as any).user as CurrentUserData;

    if (data) {
      return user?.[data];
    }

    return user;
  }
);
