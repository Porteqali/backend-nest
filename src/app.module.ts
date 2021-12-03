import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "./modules/auth.module";
import { FilesModule } from "./modules/files.module";
import { UsersModule } from "./modules/users.module";
import { SessionSchema } from "./models/sessions.schema";
import { UserSchema } from "./models/users.schema";
import { serverOnly } from "./middlewares/server.middleware";
import { AuthCheckMiddleware, GuestMiddleware } from "./middlewares/auth.middleware";
import { ContactRequestModule } from "./modules/contactRequest.module";

@Module({
    imports: [
        UsersModule,
        AuthModule,
        FilesModule,
        ContactRequestModule,
        ConfigModule.forRoot(),
        MongooseModule.forRoot(process.env.MONGO_URL),
        MongooseModule.forFeature([
            { name: "Session", schema: SessionSchema },
            { name: "User", schema: UserSchema },
        ]),
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(serverOnly).forRoutes({ path: "*", method: RequestMethod.ALL });

        consumer.apply(AuthCheckMiddleware).forRoutes(
            { path: "auth/refresh", method: RequestMethod.POST },
            { path: "auth/logout", method: RequestMethod.POST },

            { path: "users/info", method: RequestMethod.GET },

            { path: "admin/*", method: RequestMethod.ALL },
        );

        consumer.apply(GuestMiddleware).forRoutes(
            { path: "auth/register", method: RequestMethod.ALL },
            { path: "auth/login", method: RequestMethod.ALL },

            { path: "auth/login/google", method: RequestMethod.ALL },
            { path: "auth/login/google/callback", method: RequestMethod.ALL },
        );
    }
}
