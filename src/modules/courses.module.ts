import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CoursesController } from "src/controllers/courses.controller";
import { CourseGroupSchema } from "src/models/courseGroups.schema";
import { CourseRatingSchema } from "src/models/courseRatings.schema";
import { CourseSchema } from "src/models/courses.schema";
import { DiscountSchema } from "src/models/discount.schema";
import { UserCourseSchema } from "src/models/userCourses.schema";
import { UserSchema } from "src/models/users.schema";
import { DiscountService } from "src/services/discount.service";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "CourseGroup", schema: CourseGroupSchema },
            { name: "Course", schema: CourseSchema },
            { name: "User", schema: UserSchema },
            { name: "UserCourse", schema: UserCourseSchema },
            { name: "CourseRating", schema: CourseRatingSchema },
            { name: "Discount", schema: DiscountSchema },
        ]),
    ],
    controllers: [CoursesController],
    providers: [DiscountService],
    exports: [],
})
export class CoursesModule {}
