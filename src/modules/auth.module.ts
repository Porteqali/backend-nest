import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { RoleSchema } from "src/models/permissionGroups.schema";
import { SessionSchema } from "src/models/sessions.schema";
import { UserSchema } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import { AuthController } from "../controllers/auth.controller";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "User", schema: UserSchema },
            { name: "Session", schema: SessionSchema },
            { name: "Role", schema: RoleSchema },
        ]),
    ],
    controllers: [AuthController],
    providers: [AuthService],
    exports: [],
})
export class AuthModule {}
