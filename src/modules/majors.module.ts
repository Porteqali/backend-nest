import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MajorsController } from "src/controllers/majors.controller";
import { BundleSchema } from "src/models/bundles.schema";
import { CourseSchema } from "src/models/courses.schema";
import { DiscountSchema } from "src/models/discount.schema";
import { MajorSchema } from "src/models/majors.schema";
import { UserSchema } from "src/models/users.schema";
import { DiscountService } from "src/services/discount.service";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "User", schema: UserSchema },
            { name: "Major", schema: MajorSchema },
            { name: "Bundle", schema: BundleSchema },
            { name: "Course", schema: CourseSchema },
            { name: "Discount", schema: DiscountSchema },
        ]),
    ],
    controllers: [MajorsController],
    providers: [DiscountService],
    exports: [],
})
export class MajorsModule {}
