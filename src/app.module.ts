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
import { CoursesModule } from "./modules/courses.module";
import { TeachersController } from "./controllers/web/teachers.controller";
import { CourseSchema } from "./models/courses.schema";
import { ArticleSchema } from "./models/articles.schema";
import { SearchController } from "./controllers/web/search.controller";
import { SearchService } from "./services/search.service";
import { DiscountService } from "./services/discount.service";
import { DiscountSchema } from "./models/discount.schema";
import { CartModule } from "./modules/cart.module";
import { UserProfileController } from "./controllers/web/userProfile.controller";
import { UserCourseSchema } from "./models/userCourses.schema";

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
        CoursesModule,
        CartModule,
        ConfigModule.forRoot(),
        MongooseModule.forRoot(process.env.MONGO_URL),
        MongooseModule.forFeature([
            { name: "Session", schema: SessionSchema },
            { name: "User", schema: UserSchema },
            { name: "Course", schema: CourseSchema },
            { name: "UserCourse", schema: UserCourseSchema },
            { name: "Article", schema: ArticleSchema },
            { name: "Discount", schema: DiscountSchema },
        ]),
    ],
    controllers: [AppController, AboutUsController, ContactInfoController, LatestNewsController, TeachersController, SearchController, UserProfileController],
    providers: [AppService, SearchService, DiscountService],
    exports: [],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(serverOnly).forRoutes({ path: "*", method: RequestMethod.ALL });

        consumer.apply(AuthCheckMiddleware).forRoutes(
            { path: "auth/refresh", method: RequestMethod.POST },
            { path: "auth/logout", method: RequestMethod.POST },

            { path: "comments/send", method: RequestMethod.POST },
            { path: "like-article/*", method: RequestMethod.POST },
            { path: "/course/*/score", method: RequestMethod.POST },

            { path: "/payment", method: RequestMethod.ALL },
            { path: "/payment-callback/*", method: RequestMethod.ALL },

            { path: "users/info", method: RequestMethod.GET },
            { path: "users/edit-info", method: RequestMethod.POST },
            { path: "users/edit-avatar-image", method: RequestMethod.POST },
            { path: "users/delete-avatar-image", method: RequestMethod.DELETE },
            { path: "users/send-verification-code", method: RequestMethod.POST },
            { path: "users/verify", method: RequestMethod.POST },

            { path: "user-profile/courses", method: RequestMethod.GET },

            { path: "admin/*", method: RequestMethod.ALL },
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
