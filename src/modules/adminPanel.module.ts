import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthService } from "src/services/auth.service";
import { PermissionGroupController } from "src/controllers/admin/permissionGroup.controller";
import { CourseSchema } from "src/models/courses.schema";
import { PermissionGroupSchema } from "src/models/permissionGroups.schema";
import { PermissionSchema } from "src/models/permissions.schema";
import { SessionSchema } from "src/models/sessions.schema";
import { UserSchema } from "src/models/users.schema";
import { ArticleSchema } from "src/models/articles.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "Session", schema: SessionSchema },
            { name: "User", schema: UserSchema },
            { name: "Permission", schema: PermissionSchema },
            { name: "PermissionGroup", schema: PermissionGroupSchema },
            { name: "Course", schema: CourseSchema },
            { name: "Article", schema: ArticleSchema },
        ]),
    ],
    controllers: [PermissionGroupController],
    providers: [AuthService],
    exports: [],
})
export class AdminPanelModule {}