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
import { FaqsModule } from "./modules/faqs.module";
import { CollaborateRequestModule } from "./modules/collaborateRequest.module";
import { ArticlesModule } from "./modules/articles.module";
import { CourseGroupModule } from "./modules/courseGroup.module";
import { AboutUsController } from "./controllers/web/aboutUs.controller";
import { ContactInfoController } from "./controllers/web/contactInfo.controller";
import { LatestNewsController } from "./controllers/web/latestNews.controller";
import { CommentsModule } from "./modules/comments.module";

@Module({
    imports: [
        UsersModule,
        AuthModule,
        FilesModule,
        FaqsModule,
        ArticlesModule,
        CommentsModule,
        ContactRequestModule,
        CollaborateRequestModule,
        CourseGroupModule,
        ConfigModule.forRoot(),
        MongooseModule.forRoot(process.env.MONGO_URL),
        MongooseModule.forFeature([
            { name: "Session", schema: SessionSchema },
            { name: "User", schema: UserSchema },
        ]),
    ],
    controllers: [AppController, AboutUsController, ContactInfoController, LatestNewsController],
    providers: [AppService],
    exports: [],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(serverOnly).forRoutes({ path: "*", method: RequestMethod.ALL });

        consumer.apply(AuthCheckMiddleware).forRoutes(
            { path: "auth/refresh", method: RequestMethod.POST },
            { path: "auth/logout", method: RequestMethod.POST },

            { path: "users/info", method: RequestMethod.GET },

            { path: "admin/*", method: RequestMethod.ALL },

            { path: "comments/send", method: RequestMethod.POST },
            { path: "like-article/*", method: RequestMethod.POST },
        );

        consumer.apply(GuestMiddleware).forRoutes(
            { path: "auth/send-code", method: RequestMethod.ALL },
            { path: "auth/verify", method: RequestMethod.ALL },
            { path: "auth/register", method: RequestMethod.ALL },
            { path: "auth/login", method: RequestMethod.ALL },

            { path: "auth/continue-with-google", method: RequestMethod.ALL },
        );
    }
}
