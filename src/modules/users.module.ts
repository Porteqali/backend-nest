import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UsersController } from "src/controllers/users.controller";
import { PermissionSchema } from "src/models/permissions.schema";
import { PermissionGroupSchema } from "src/models/permissionGroups.schema";
import { UserSchema } from "src/models/users.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "User", schema: UserSchema },
            { name: "PermissionGroup", schema: PermissionGroupSchema },
            { name: "Permission", schema: PermissionSchema },
        ]),
    ],
    controllers: [UsersController],
    providers: [],
    exports: [],
})
export class UsersModule {}
