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
import { CommentSchema } from "src/models/comments.schema";
import { CommentsController } from "src/controllers/admin/comments.controller";
import { TeacherController } from "src/controllers/admin/teacher.controller";
import { CommissionController } from "src/controllers/admin/commission.controller";
import { CommissionSchema } from "src/models/commissions.schema";
import { CourseGroupsController } from "src/controllers/admin/courseGroup.controller";
import { CourseGroupSchema } from "src/models/courseGroups.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "Session", schema: SessionSchema },
            { name: "User", schema: UserSchema },
            { name: "Permission", schema: PermissionSchema },
            { name: "PermissionGroup", schema: PermissionGroupSchema },
            { name: "CommissionPayment", schema: CommissionPaymentSchema },
            { name: "Commission", schema: CommissionSchema },
            { name: "Course", schema: CourseSchema },
            { name: "CourseGroup", schema: CourseGroupSchema },
            { name: "UserCourse", schema: UserCourseSchema },
            { name: "Article", schema: ArticleSchema },
            { name: "Comment", schema: CommentSchema },
        ]),
    ],
    controllers: [
        PermissionGroupController,
        AdminListController,
        MarketerController,
        UserController,
        CommentsController,
        TeacherController,
        CommissionController,
        CourseGroupsController,
    ],
    providers: [AuthService],
    exports: [],
})
export class AdminPanelModule {}
