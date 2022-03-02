import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CartController } from "src/controllers/cart.controller";
import { AnalyticsSchema } from "src/models/analytics.schema";
import { CommissionSchema } from "src/models/commissions.schema";
import { CourseAnalyticSchema } from "src/models/courseAnalytics.schema";
import { CourseSchema } from "src/models/courses.schema";
import { DiscountSchema } from "src/models/discount.schema";
import { MarketerCoursesSchema } from "src/models/marketerCourses.schema";
import { UserCourseSchema } from "src/models/userCourses.schema";
import { UserSchema } from "src/models/users.schema";
import { AnalyticsService } from "src/services/analytics.service";
import { CartService } from "src/services/cart.service";
import { DiscountService } from "src/services/discount.service";
import { MarketingService } from "src/services/marketing.service";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "User", schema: UserSchema },
            { name: "Course", schema: CourseSchema },
            { name: "Discount", schema: DiscountSchema },
            { name: "UserCourse", schema: UserCourseSchema },
            { name: "MarketerCourse", schema: MarketerCoursesSchema },
            { name: "Commission", schema: CommissionSchema },
            { name: "CourseAnalytic", schema: CourseAnalyticSchema },
            { name: "Analytic", schema: AnalyticsSchema },
        ]),
    ],
    controllers: [CartController],
    providers: [DiscountService, CartService, MarketingService, AnalyticsService],
    exports: [],
})
export class CartModule {}
