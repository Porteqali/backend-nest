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
import { UserWalletController } from "./controllers/web/userWallet.controller";
import { WalletTransactionSchema } from "./models/walletTransactions.schema";
import { CommentSchema } from "./models/comments.schema";
import { SeederModule } from "./modules/seeder.module";
import { AdminPanelModule } from "./modules/adminPanel.module";
import { BannerController } from "./controllers/web/banner.controller";
import { MarketerPanelModule } from "./modules/marketerPanel.module";
import { TeacherPanelModule } from "./modules/teacherPanel.module";
import { MetadataController } from "./controllers/metadata.controller";
import { MarketersController } from "./controllers/web/marketers.controller";
import { StaticPagesController } from "./controllers/web/staticPages.controller";
import { ScheduleModule } from "@nestjs/schedule";
import { SchedulerModule } from "./modules/scheduler.module";
import { MetadataSchema } from "./models/metadatas.schema";
import { AnalyticsSchema } from "./models/analytics.schema";
import { AnalyticsService } from "./services/analytics.service";
import { MajorsController } from "./controllers/majors.controller";
import { MajorSchema } from "./models/majors.schema";
import { BundlesModule } from "./modules/bundles.module";
import { MajorsModule } from "./modules/majors.module";
import { BundleSchema } from "./models/bundles.schema";
import { UserRoadmapController } from "./controllers/web/userRoadmap.controller";
import { UserRoadmapSchema } from "./models/userRoadmaps.schema";
import { RoadmapQuestionController } from "./controllers/roadmapQuestions.controller";
import { RoadmapQuestionSchema } from "./models/roadmapQuestions.schema";

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
        AdminPanelModule,
        MarketerPanelModule,
        TeacherPanelModule,
        SeederModule,
        SchedulerModule,
        BundlesModule,
        MajorsModule,
        ScheduleModule.forRoot(),
        ConfigModule.forRoot(),
        MongooseModule.forRoot(process.env.MONGO_URL, { dbName: "porteqali" }),
        MongooseModule.forFeature([
            { name: "Session", schema: SessionSchema },
            { name: "User", schema: UserSchema },
            { name: "Course", schema: CourseSchema },
            { name: "UserCourse", schema: UserCourseSchema },
            { name: "Comment", schema: CommentSchema },
            { name: "Article", schema: ArticleSchema },
            { name: "Discount", schema: DiscountSchema },
            { name: "WalletTransaction", schema: WalletTransactionSchema },
            { name: "Metadata", schema: MetadataSchema },
            { name: "Analytic", schema: AnalyticsSchema },
            { name: "Major", schema: MajorSchema },
            { name: "Bundle", schema: BundleSchema },
            { name: "UserRoadmap", schema: UserRoadmapSchema },
            { name: "RoadmapQuestion", schema: RoadmapQuestionSchema },
        ]),
    ],
    controllers: [
        AppController,
        AboutUsController,
        ContactInfoController,
        BannerController,
        StaticPagesController,
        LatestNewsController,
        TeachersController,
        MarketersController,
        SearchController,
        UserProfileController,
        UserWalletController,
        UserRoadmapController,
        MajorsController,
        MetadataController,
        RoadmapQuestionController,
    ],
    providers: [AppService, SearchService, DiscountService, AnalyticsService],
    exports: [],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(serverOnly).forRoutes({ path: "*", method: RequestMethod.ALL });

        consumer.apply(AuthCheckMiddleware).forRoutes(
            { path: "auth/refresh", method: RequestMethod.POST },
            { path: "auth/check-if-role/*", method: RequestMethod.POST },

            { path: "comments/send", method: RequestMethod.POST },
            { path: "like-article/*", method: RequestMethod.POST },
            { path: "/course/*/score", method: RequestMethod.POST },
            { path: "/cart-purchased-courses", method: RequestMethod.ALL },

            { path: "/course-payment", method: RequestMethod.ALL },
            { path: "/course-payment-callback/*", method: RequestMethod.ALL },

            { path: "wallet-payment", method: RequestMethod.ALL },
            { path: "wallet-payment-callback/*", method: RequestMethod.ALL },

            { path: "users/info", method: RequestMethod.ALL },
            { path: "users/check-verification", method: RequestMethod.GET },
            { path: "users/edit-info", method: RequestMethod.POST },
            { path: "users/edit-avatar-image", method: RequestMethod.POST },
            { path: "users/delete-avatar-image", method: RequestMethod.DELETE },
            { path: "users/send-verification-code", method: RequestMethod.POST },
            { path: "users/verify", method: RequestMethod.POST },

            { path: "user-profile/*", method: RequestMethod.ALL },
            { path: "user-roadmap/*", method: RequestMethod.ALL },

            { path: "admin/*", method: RequestMethod.ALL },
            { path: "marketer-panel/*", method: RequestMethod.ALL },
            { path: "teacher-panel/*", method: RequestMethod.ALL },

            { path: "bundles/info/*", method: RequestMethod.GET },
            { path: "bundles/activate/*", method: RequestMethod.POST },
        );

        consumer.apply(GuestMiddleware).forRoutes(
            { path: "auth/send-code", method: RequestMethod.ALL },
            { path: "auth/verify", method: RequestMethod.ALL },
            { path: "auth/register", method: RequestMethod.ALL },
            { path: "auth/login", method: RequestMethod.ALL },
            { path: "auth/forget-password/*", method: RequestMethod.ALL },

            { path: "auth/continue-with-google", method: RequestMethod.ALL },
        );
    }
}
