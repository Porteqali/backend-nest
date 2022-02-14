import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Request } from "src/interfaces/Request";
import { Model } from "mongoose";
import { SessionDocument } from "src/models/sessions.schema";
import { UserDocument } from "src/models/users.schema";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";

@Injectable()
export class TestTask {
    constructor(private schedulerRegistry: SchedulerRegistry) {}

    // @Cron(CronExpression.EVERY_10_MINUTES, { name: "test", timeZone: "Asia/Tehran" })
    // async test(): Promise<string | void> {}
}
