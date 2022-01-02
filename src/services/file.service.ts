import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { Model } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { CourseDocument } from "src/models/courses.schema";
import { loadUser } from "src/helpers/auth.helper";

@Injectable()
export class FileService {
    constructor(@InjectModel("User") private readonly UserModel: Model<UserDocument>, @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>) {}

    async courseCheck(req: Request, filepathArray: Array<string>): Promise<void> {
        // ["storage", "private", "course_videos", "61bef385f1dc2180e2f0e855", "91b5c15d-2b25-45e4-8c0c-c14b95333a0a.mp4"];

        const course_id = filepathArray[3];
        const topicFile = filepathArray[4];
        const topicFileLink = `/file/private/course_videos/${course_id}/${topicFile}`;

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

        // TODO
        // check if topic is free -> if so serve it
        // check if user is logged -> if not then 403
        // if topic is free for user and user is logged in serve it
        // if user purcased the course then serve it

        // const loadedUser = await loadUser(req);
        // if (!loadedUser) throw new ForbiddenException();
    }
}
