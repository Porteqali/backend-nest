import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Request } from "src/interfaces/Request";
import { Model } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { AnalyticsDocument } from "src/models/analytics.schema";
import * as moment from "moment";

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Analytic") private readonly AnalyticModel: Model<AnalyticsDocument>,
    ) {}

    async analyticCountUp(
        req: Request,
        marketer = null,
        teacher = null,
        incrementBy: number,
        infoName: "income" | "new-users" | "sells" | "link-clicked",
        forGroup: "total" | "marketer" | "teacher",
        type: "both" | "daily" | "monthly" = "both",
    ): Promise<void> {
        const today = moment().format("YYYY-MM-DDT00:00:00");
        const thisMonth = moment().format("YYYY-MM-01T00:00:00");

        if (type == "both") {
            this.update(marketer, teacher, incrementBy, infoName, forGroup, "daily", today);
            this.update(marketer, teacher, incrementBy, infoName, forGroup, "monthly", thisMonth);
        } else {
            const date = type == "daily" ? today : thisMonth;
            this.update(marketer, teacher, incrementBy, infoName, forGroup, type, date);
        }
    }

    // ========================================

    private async update(marketer, teacher, incrementBy, infoName, forGroup, type, date) {
        await this.AnalyticModel.updateOne(
            {
                marketer: marketer,
                teacher: teacher,
                infoName: infoName,
                forGroup: forGroup,
                type: type,
                date: date,
            },
            { $inc: { count: incrementBy } },
            { upsert: true },
        ).exec();
    }
}
