import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SessionSchema } from "src/models/sessions.schema";
import { UserSchema } from "src/models/users.schema";
import { TestTask } from "src/schedules/test.task";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "User", schema: UserSchema },
            { name: "Session", schema: SessionSchema },
        ]),
    ],
    controllers: [],
    providers: [TestTask],
    exports: [],
})
export class SchedulerModule {}
