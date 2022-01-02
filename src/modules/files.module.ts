import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FilesController } from "src/controllers/files.controller";
import { CourseSchema } from "src/models/courses.schema";
import { PermissionGroupSchema } from "src/models/permissionGroups.schema";
import { SessionSchema } from "src/models/sessions.schema";
import { UserCourseSchema } from "src/models/userCourses.schema";
import { UserSchema } from "src/models/users.schema";
import { FileService } from "src/services/file.service";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "User", schema: UserSchema },
            { name: "Session", schema: SessionSchema },
            { name: "PermissionGroup", schema: PermissionGroupSchema },
            { name: "Course", schema: CourseSchema },
            { name: "UserCourse", schema: UserCourseSchema },
        ]),
    ],
    controllers: [FilesController],
    providers: [FileService],
    exports: [],
})
export class FilesModule {}
