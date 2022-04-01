import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BundleController } from "src/controllers/bundles.controller";
import { BundleSchema } from "src/models/bundles.schema";
import { CourseSchema } from "src/models/courses.schema";
import { DiscountSchema } from "src/models/discount.schema";
import { UserSchema } from "src/models/users.schema";
import { DiscountService } from "src/services/discount.service";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "User", schema: UserSchema },
            { name: "Bundle", schema: BundleSchema },
            { name: "Course", schema: CourseSchema },
            { name: "Discount", schema: DiscountSchema },
        ]),
    ],
    controllers: [BundleController],
    providers: [DiscountService],
    exports: [],
})
export class BundlesModule {}
