import { All, Controller, Req, Res } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from "@nestjs/swagger";
import { auth } from "../../lib/auth";
import type { Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  private handler = toNodeHandler(auth);

  @ApiExcludeEndpoint()
  @All("*path")
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    return this.handler(req, res);
  }

  @ApiOperation({ summary: "Better Auth handles all auth routes" })
  getRoutes() {
    return {
      message: "Auth routes handled by Better Auth",
      routes: [
        "POST /auth/sign-up/email - Register with email/password",
        "POST /auth/sign-in/email - Login with email/password",
        "POST /auth/sign-out - Logout",
        "GET /auth/session - Get current session",
        "POST /auth/forgot-password - Request password reset",
        "POST /auth/reset-password - Reset password with token",
      ],
    };
  }
}
