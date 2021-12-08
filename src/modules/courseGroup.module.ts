import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CourseGroupController } from "src/controllers/courseGroup.controller";
import { CourseGroupSchema } from "src/models/courseGroups.schema";

@Module({
    imports: [MongooseModule.forFeature([{ name: "CourseGroup", schema: CourseGroupSchema }])],
    controllers: [CourseGroupController],
    providers: [],
    exports: [],
})
export class CourseGroupModule {}
