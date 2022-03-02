import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ForgetPassowrdController } from "src/controllers/forgetPassword.controller";
import { AnalyticsSchema } from "src/models/analytics.schema";
import { PermissionGroupSchema } from "src/models/permissionGroups.schema";
import { SessionSchema } from "src/models/sessions.schema";
import { UserSchema } from "src/models/users.schema";
import { AnalyticsService } from "src/services/analytics.service";
import { AuthService } from "src/services/auth.service";
import { AuthController } from "../controllers/auth.controller";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "User", schema: UserSchema },
            { name: "Session", schema: SessionSchema },
            { name: "PermissionGroup", schema: PermissionGroupSchema },
            { name: "Analytic", schema: AnalyticsSchema },
        ]),
    ],
    controllers: [AuthController, ForgetPassowrdController],
    providers: [AuthService, AnalyticsService],
    exports: [],
})
export class AuthModule {}
