import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthService } from "src/services/auth.service";
import { UserSchema } from "src/models/users.schema";
import { UserCourseSchema } from "src/models/userCourses.schema";
import { MarketerCoursesSchema } from "src/models/marketerCourses.schema";
import { CommissionPaymentSchema } from "src/models/commissionPayments.schema";
import { SessionSchema } from "src/models/sessions.schema";
import { CommissionPaymentsController } from "src/controllers/teacherPanel/commissionPayments.controller";
import { CommissionsController } from "src/controllers/teacherPanel/commissions.controller";
import { CourseSchema } from "src/models/courses.schema";
import { CoursesController } from "src/controllers/teacherPanel/courses.controller";
import { CommentsController } from "src/controllers/teacherPanel/comments.controller";
import { CommentSchema } from "src/models/comments.schema";
import { DashboardController } from "src/controllers/teacherPanel/dashboard.controller";
import { CourseAnalyticSchema } from "src/models/courseAnalytics.schema";
import { AnalyticsSchema } from "src/models/analytics.schema";
import { AnalyticsService } from "src/services/analytics.service";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "User", schema: UserSchema },
            { name: "Session", schema: SessionSchema },
            { name: "Course", schema: CourseSchema },
            { name: "CommissionPayment", schema: CommissionPaymentSchema },
            { name: "UserCourse", schema: UserCourseSchema },
            { name: "Comment", schema: CommentSchema },
            { name: "MarketerCourse", schema: MarketerCoursesSchema },
            { name: "CourseAnalytic", schema: CourseAnalyticSchema },
            { name: "Analytic", schema: AnalyticsSchema },
        ]),
    ],
    controllers: [CommissionPaymentsController, CommissionsController, CoursesController, CommentsController, DashboardController],
    providers: [AuthService, AnalyticsService],
    exports: [],
})
export class TeacherPanelModule {}
