import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./modules/auth";
import { UsersModule } from "./modules/users";
import { AIsModule } from "./modules/ais";
import { DocumentsModule } from "./modules/documents";
import { ConversationsModule } from "./modules/conversations";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UsersModule,
    AIsModule,
    DocumentsModule,
    ConversationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
