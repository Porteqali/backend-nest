import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Request } from "src/interfaces/Request";
import { Model } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { MarketerCoursesDocument } from "src/models/marketerCourses.schema";

@Injectable()
export class MarketingService {
    constructor(
        @InjectModel("MarketerCourse") private readonly MarketerCourseModel: Model<MarketerCoursesDocument>,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
    ) {}

    async findMarketer(req: Request, courseId: any): Promise<string | null> {
        if (!req.user) return;
        const user = req.user.user;

        const marketingCode = req.cookies["marketing_code"] || "";

        let marketer = null;
        if (user.registeredWith && user.registeredWith.endsAt && user.registeredWith.endsAt >= new Date(Date.now())) {
            marketer = await this.UserModel.findOne({ _id: user.registeredWith.marketer, role: "marketer" }).exec();
        } else {
            if (!marketingCode) return;
            marketer = await this.UserModel.findOne({ marketingCode: marketingCode, role: "marketer" }).exec();
        }

        let marketerCourse = null;
        if (marketer && marketer != null) {
            marketerCourse = await this.MarketerCourseModel.findOne({ marketer: marketer._id, status: "active" }).populate("marketer").exec();
        } else {
            if (!marketingCode) return;
            marketerCourse = await this.MarketerCourseModel.findOne({ code: marketingCode, status: "active" }).populate("marketer").exec();
        }

        if (!marketerCourse) return;
        return marketer._id;
    }

    async calcMarketerCut(req: Request, courseId: any, marketerId: any, coursePrice: number): Promise<number> {
        if (!marketerId) return 0;

        const marketerCourse = await this.MarketerCourseModel.findOne({ course: courseId, marketer: marketerId }).exec();
        if (!marketerCourse) return 0;

        const marketer = await this.UserModel.findOne({ _id: marketerId }).exec();
        if (!marketer) return 0;

        let marketerCut = 0;
        switch (marketerCourse.commissionType) {
            case "percent":
                marketerCut = coursePrice * (marketerCourse.commissionAmount / 100);
                break;
            case "number":
                marketerCut = marketerCourse.commissionAmount;
                break;
        }

        // add marketerCut to him/her commission balance
        await this.UserModel.updateOne({ _id: marketer._id }, { commissionBalance: marketer.commissionBalance + marketerCut }).exec();

        return marketerCut;
    }
}
