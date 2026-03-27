import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Scope } from '@sentry/nestjs';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';
import { Sentry } from '../../lib/sentry';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.message : 'Internal server error';

    const correlationId = request.headers[CORRELATION_ID_HEADER] as string;
    const isDev = process.env.NODE_ENV !== 'production';

    // Capture unexpected errors (5xx) in Sentry, skip expected HTTP exceptions
    if (!(exception instanceof HttpException) || status >= 500) {
      Sentry.withScope((scope: Scope) => {
        if (correlationId) scope.setTag('correlationId', correlationId);
        scope.setTag('path', request.url);
        scope.setTag('method', request.method);
        // Tag with aiId if present in route params (e.g. /ais/:aiId/*)
        const aiId = request.params?.aiId || request.params?.id;
        if (aiId) scope.setTag('aiId', aiId);
        Sentry.captureException(exception);
      });
    }

    // Add Retry-After header for rate-limited responses
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      response.setHeader('Retry-After', '1');
    }

    // Preserve custom fields from HttpException response (e.g. { reason: 'access_code' })
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;
    const customFields: Record<string, unknown> =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? Object.fromEntries(
            Object.entries(exceptionResponse as Record<string, unknown>).filter(
              ([k]) => !['statusCode', 'message', 'error'].includes(k)
            )
          )
        : {};

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(correlationId ? { correlationId } : {}),
      ...(isDev && exception instanceof Error ? { stack: exception.stack } : {}),
      ...customFields,
    });
  }
}
