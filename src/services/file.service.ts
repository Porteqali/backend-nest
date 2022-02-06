import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { Model } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { CourseDocument } from "src/models/courses.schema";
import { loadUser } from "src/helpers/auth.helper";
import { UserCourseDocument } from "src/models/userCourses.schema";

@Injectable()
export class FileService {
    constructor(
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("UserCourse") private readonly UserCourseModel: Model<UserCourseDocument>,
    ) {}

    async courseCheck(req: Request, filepath: string, filepathArray: Array<string>, loadedUser: any): Promise<void> {
        // ["storage", "private", "course_videos", "61bef385f1dc2180e2f0e855", "91b5c15d-2b25-45e4-8c0c-c14b95333a0a.mp4"];
        const course_id = filepathArray[3];
        const topicFile = filepathArray[4];
        const topicFileLink = filepath;

        const course = await this.CourseModel.findOne({ _id: course_id }).exec();
        if (!course) throw new ForbiddenException();

        let topic = null;
        for (let i = 0; i < course.topics.length; i++) {
            if (course.topics[i].file === topicFileLink) {
                topic = course.topics[i];
                break;
            }
        }
        if (!topic) throw new ForbiddenException();

        if (topic.isFree) return;
        if (topic.isFreeForUsers && !!loadedUser) return;

        let purchased = false;
        if (!!loadedUser) purchased = await this.UserCourseModel.exists({ user: loadedUser.user._id, course: course._id, status: "ok" });
        if (purchased) return;

        throw new ForbiddenException();
    }
}
