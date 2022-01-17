import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PermissionSchema } from "src/models/permissions.schema";
import { PermissionGroupSchema } from "src/models/permissionGroups.schema";
import { UserSchema } from "src/models/users.schema";
import { Seeder } from "src/database/seeder";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "User", schema: UserSchema },
            { name: "PermissionGroup", schema: PermissionGroupSchema },
            { name: "Permission", schema: PermissionSchema },
        ]),
    ],
    controllers: [Seeder],
    providers: [],
    exports: [],
})
export class SeederModule {}
