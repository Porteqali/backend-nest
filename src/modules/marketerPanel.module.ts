import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthService } from "src/services/auth.service";
import { UserSchema } from "src/models/users.schema";
import { UserCourseSchema } from "src/models/userCourses.schema";
import { MarketerCoursesSchema } from "src/models/marketerCourses.schema";
import { CustomersController } from "src/controllers/marketerPanel/customers.controller";
import { CommissionPaymentSchema } from "src/models/commissionPayments.schema";
import { SessionSchema } from "src/models/sessions.schema";
import { CommissionsController } from "src/controllers/marketerPanel/commissions.controller";
import { CommissionPaymentsController } from "src/controllers/marketerPanel/commissionPayments.controller";
import { CoursesController } from "src/controllers/marketerPanel/courses.controller";
import { DashboardController } from "src/controllers/marketerPanel/dashboard.controller";
import { CourseSchema } from "src/models/courses.schema";
import { CourseAnalyticSchema } from "src/models/courseAnalytics.schema";
import { AnalyticsSchema } from "src/models/analytics.schema";
import { AnalyticsService } from "src/services/analytics.service";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "User", schema: UserSchema },
            { name: "Session", schema: SessionSchema },
            { name: "CommissionPayment", schema: CommissionPaymentSchema },
            { name: "UserCourse", schema: UserCourseSchema },
            { name: "MarketerCourse", schema: MarketerCoursesSchema },
            { name: "Course", schema: CourseSchema },
            { name: "CourseAnalytic", schema: CourseAnalyticSchema },
            { name: "Analytic", schema: AnalyticsSchema },
        ]),
    ],
    controllers: [CustomersController, CommissionsController, CommissionPaymentsController, CoursesController, DashboardController],
    providers: [AuthService, AnalyticsService],
    exports: [],
})
export class MarketerPanelModule {}
