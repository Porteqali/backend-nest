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
import { AdminListController } from "src/controllers/admin/adminList.controller";
import { MarketerController } from "src/controllers/admin/marketer.controller";
import { CommissionPaymentSchema } from "src/models/commissionPayments.schema";
import { UserCourseSchema } from "src/models/userCourses.schema";
import { UserController } from "src/controllers/admin/users.controller";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "Session", schema: SessionSchema },
            { name: "User", schema: UserSchema },
            { name: "Permission", schema: PermissionSchema },
            { name: "PermissionGroup", schema: PermissionGroupSchema },
            { name: "CommissionPayment", schema: CommissionPaymentSchema },
            { name: "Course", schema: CourseSchema },
            { name: "UserCourse", schema: UserCourseSchema },
            { name: "Article", schema: ArticleSchema },
        ]),
    ],
    controllers: [PermissionGroupController, AdminListController, MarketerController, UserController],
    providers: [AuthService],
    exports: [],
})
export class AdminPanelModule {}
