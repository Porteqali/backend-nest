import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CartController } from "src/controllers/cart.controller";
import { CourseSchema } from "src/models/courses.schema";
import { DiscountSchema } from "src/models/discount.schema";
import { UserCourseSchema } from "src/models/userCourses.schema";
import { UserSchema } from "src/models/users.schema";
import { CartService } from "src/services/cart.service";
import { DiscountService } from "src/services/discount.service";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "User", schema: UserSchema },
            { name: "Course", schema: CourseSchema },
            { name: "Discount", schema: DiscountSchema },
            { name: "UserCourse", schema: UserCourseSchema },
        ]),
    ],
    controllers: [CartController],
    providers: [DiscountService, CartService],
    exports: [],
})
export class CartModule {}
