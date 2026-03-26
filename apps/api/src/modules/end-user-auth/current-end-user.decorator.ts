import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { EndUser } from '@corpusai/database';
import type { Request } from 'express';

export const CurrentEndUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): EndUser => {
    const request = ctx.switchToHttp().getRequest<Request & { endUser: EndUser }>();
    return request.endUser;
  }
);
