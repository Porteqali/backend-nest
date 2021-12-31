import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CoursesController } from "src/controllers/courses.controller";
import { CourseImporter } from "src/importer/course.importer";
import { CourseTopicImporter } from "src/importer/courseTopic.importer";
import { CourseGroupSchema } from "src/models/courseGroups.schema";
import { CourseSchema } from "src/models/courses.schema";
import { UserCourseSchema } from "src/models/userCourses.schema";
import { UserSchema } from "src/models/users.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "CourseGroup", schema: CourseGroupSchema },
            { name: "Course", schema: CourseSchema },
            { name: "User", schema: UserSchema },
            { name: "UserCourse", schema: UserCourseSchema },
        ]),
    ],
    controllers: [CoursesController, CourseImporter, CourseTopicImporter],
    providers: [],
    exports: [],
})
export class CoursesModule {}
