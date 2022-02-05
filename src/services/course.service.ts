import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Request } from "src/interfaces/Request";
import { Model } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { MarketingService } from "./marketing.service";
import { LinkDocument } from "src/models/links.schema";
import { randStr } from "src/helpers/str.helper";

@Injectable()
export class CourseService {
    constructor(@InjectModel("User") private readonly UserModel: Model<UserDocument>, @InjectModel("Link") private readonly LinkModel: Model<LinkDocument>) {}

    private stripTrailingSlash(str) {
        return str.endsWith("/") ? str.slice(0, -1) : str;
    }

    // ========================================

    async generateLinkForTopic(req: Request, link: string, usedFor: "general" | "courseVideo" = "general", extra: any = {}): Promise<string> {
        let internal = "";
        let description = extra.description || "";

        if (usedFor == "courseVideo") {
            const extension = this.stripTrailingSlash(link).slice(((link.lastIndexOf(".") - 1) >>> 0) + 2);
            internal = `/file/stream/course_videos/${extra.course_id}/${randStr(20)}.${extension}`;
            description = "internal link for connecting to external video link";
        } else {
            internal = `/file/stream/${randStr(25)}`;
        }

        await this.LinkModel.updateOne({ external: link }, { author: req.user.user._id, internal, description, usedFor }, { upsert: true }).exec();
        return internal;
    }
}
