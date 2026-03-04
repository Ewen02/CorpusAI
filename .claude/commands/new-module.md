Create a new NestJS module in `apps/api/src/modules/$ARGUMENTS`.

Follow the existing module pattern:

1. Create the module file (`$ARGUMENTS.module.ts`), controller, service, and `dto/` directory
2. Add Swagger decorators (`@ApiTags`, `@ApiOperation`) on the controller
3. Add `@UseGuards(AuthGuard)` and `@ApiBearerAuth()` on the controller
4. Add DTOs with `class-validator` decorators and `@ApiProperty`/`@ApiPropertyOptional`
5. Use `@CurrentUser()` decorator for authenticated endpoints
6. Use ownership verification from `shared/ownership.ts` where applicable
7. Import Prisma directly: `import { prisma } from "@corpusai/database"`
8. Add the module to `AppModule` imports in `app.module.ts`
9. Create an `index.ts` barrel export

Reference implementation: `apps/api/src/modules/ais/` for the complete pattern.
