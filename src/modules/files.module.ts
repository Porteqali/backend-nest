import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FilesController } from "src/controllers/files.controller";
import { PermissionGroupSchema } from "src/models/permissionGroups.schema";
import { SessionSchema } from "src/models/sessions.schema";
import { UserSchema } from "src/models/users.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "User", schema: UserSchema },
            { name: "Session", schema: SessionSchema },
            { name: "PermissionGroup", schema: PermissionGroupSchema },
        ]),
    ],
    controllers: [FilesController],
    providers: [],
    exports: [],
})
export class FilesModule {}
