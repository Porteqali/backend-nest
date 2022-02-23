import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthService } from "src/services/auth.service";
import { PermissionGroupController } from "src/controllers/admin/permissionGroup.controller";
import { CourseSchema } from "src/models/courses.schema";
import { PermissionGroupSchema } from "src/models/permissionGroups.schema";
import { PermissionSchema } from "src/models/permissions.schema";
import { SessionSchema } from "src/models/sessions.schema";
import { UserSchema } from "src/models/users.schema";
import { ArticleSchema } from "src/models/articles.schema";
import { AdminListController } from "src/controllers/admin/adminList.controller";
import { MarketerController } from "src/controllers/admin/marketer.controller";
import { CommissionPaymentSchema } from "src/models/commissionPayments.schema";
import { UserCourseSchema } from "src/models/userCourses.schema";
import { UserController } from "src/controllers/admin/users.controller";
import { CommentSchema } from "src/models/comments.schema";
import { CommentsController } from "src/controllers/admin/comments.controller";
import { TeacherController } from "src/controllers/admin/teacher.controller";
import { CommissionController } from "src/controllers/admin/commission.controller";
import { CommissionSchema } from "src/models/commissions.schema";
import { CourseGroupsController } from "src/controllers/admin/courseGroup.controller";
import { CourseGroupSchema } from "src/models/courseGroups.schema";
import { DiscountController } from "src/controllers/admin/discount.controller";
import { DiscountSchema } from "src/models/discount.schema";
import { WalletTransactionController } from "src/controllers/admin/walletTransaction.controller";
import { WalletTransactionSchema } from "src/models/walletTransactions.schema";
import { CourseTransactionController } from "src/controllers/admin/courseTransaction.controller";
import { HomeController } from "src/controllers/admin/home.controller";
import { CollaborateRequestSchema } from "src/models/collaborateRequests.schema";
import { ContactRequestSchema } from "src/models/contactRequests.schema";
import { CollaborateRequestController } from "src/controllers/admin/collaborateRequest.controller";
import { ContactRequestController } from "src/controllers/admin/contactRequest.controller";
import { FaqController } from "src/controllers/admin/faq.controller";
import { FaqSchema } from "src/models/faqs.schema";
import { TestimonialsController } from "src/controllers/admin/testimonials.controller";
import { TestimonialSchema } from "src/models/testimonials.schema";
import { BannerController } from "src/controllers/admin/banner.controller";
import { ContactInfoController } from "src/controllers/admin/contactInfo.controller";
import { ArticleController } from "src/controllers/admin/article.controller";
import { CourseController } from "src/controllers/admin/course.controller";
import { LinkSchema } from "src/models/links.schema";
import { CourseService } from "src/services/course.service";
import { MarketerCoursesSchema } from "src/models/marketerCourses.schema";
import { DashboardController } from "src/controllers/admin/dashboard.controller";
import { StaticPagesController } from "src/controllers/admin/staticPages.controller";
import { LatestNewsController } from "src/controllers/admin/latestNews.controller";
import { MetadataController } from "src/controllers/admin/metadata.controller";
import { MetadataSchema } from "src/models/metadatas.schema";
import { ImporterController } from "src/controllers/admin/importer.controller";
import { CourseRatingSchema } from "src/models/courseRatings.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "Session", schema: SessionSchema },
            { name: "User", schema: UserSchema },
            { name: "Permission", schema: PermissionSchema },
            { name: "PermissionGroup", schema: PermissionGroupSchema },
            { name: "CommissionPayment", schema: CommissionPaymentSchema },
            { name: "Commission", schema: CommissionSchema },
            { name: "Discount", schema: DiscountSchema },
            { name: "Course", schema: CourseSchema },
            { name: "CourseGroup", schema: CourseGroupSchema },
            { name: "UserCourse", schema: UserCourseSchema },
            { name: "Article", schema: ArticleSchema },
            { name: "Comment", schema: CommentSchema },
            { name: "WalletTransaction", schema: WalletTransactionSchema },
            { name: "CollaborateRequest", schema: CollaborateRequestSchema },
            { name: "ContactRequest", schema: ContactRequestSchema },
            { name: "Faq", schema: FaqSchema },
            { name: "Testimonial", schema: TestimonialSchema },
            { name: "Link", schema: LinkSchema },
            { name: "MarketerCourse", schema: MarketerCoursesSchema },
            { name: "Metadata", schema: MetadataSchema },
            { name: "CourseRating", schema: CourseRatingSchema },
        ]),
    ],
    controllers: [
        PermissionGroupController,
        AdminListController,
        MarketerController,
        UserController,
        CommentsController,
        TeacherController,
        CommissionController,
        CourseGroupsController,
        DiscountController,
        WalletTransactionController,
        CourseTransactionController,
        HomeController,
        CollaborateRequestController,
        ContactRequestController,
        FaqController,
        TestimonialsController,
        BannerController,
        ContactInfoController,
        ArticleController,
        CourseController,
        DashboardController,
        StaticPagesController,
        LatestNewsController,
        MetadataController,
        ImporterController,
    ],
    providers: [AuthService, CourseService],
    exports: [],
})
export class AdminPanelModule {}
