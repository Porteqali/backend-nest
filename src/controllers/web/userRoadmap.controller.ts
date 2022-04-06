import { Body, Controller, Delete, Get, Post, Req, Res } from "@nestjs/common";
import { ForbiddenException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { BundleDocument } from "src/models/bundles.schema";
import { UserRoadmapDocument } from "src/models/userRoadmaps.schema";
import { CourseDocument } from "src/models/courses.schema";
import * as moment from "moment";
import { DiscountDocument } from "src/models/discount.schema";
import { randStr } from "src/helpers/str.helper";

@Controller("user-roadmap")
export class UserRoadmapController {
    constructor(
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("Discount") private readonly DiscountModel: Model<DiscountDocument>,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Bundle") private readonly BundleModel: Model<BundleDocument>,
        @InjectModel("UserRoadmap") private readonly UserRoadmapModel: Model<UserRoadmapDocument>,
    ) {}

    @Get("/active-roadmap")
    async getUserActiveRoadmap(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const roadmap = await this.UserRoadmapModel.findOne({ user: req.user.user._id, status: "active" }).exec();
        if (!roadmap) throw NotFoundException;

        const bundleResult = await this.BundleModel.findOne({ _id: roadmap.bundle }).exec();
        if (!bundleResult) throw NotFoundException;
        const bundle: any = bundleResult.toJSON();

        const courses = {};
        for (let i = 0; i < bundle.courses.length; i++) courses[bundle.courses[i].course] = bundle.courses[i];
        bundle.courses = courses;

        let currentCourse: any = {};
        for (const courseId in bundle.courses) {
            const course = await this.CourseModel.findOne({ _id: new Types.ObjectId(courseId.toString()) })
                .select("image name teacher")
                .populate("teacher", "image name family")
                .exec();
            bundle.courses[courseId].course = { _id: course._id, image: course.image, name: course.name, teacher: course.teacher };
            bundle.courses[courseId].course.minimumTimeNeeded = bundle.courses[courseId].minimumTimeNeeded;

            if (course._id.toString() == roadmap.currentCourse.toString()) currentCourse = bundle.courses[courseId].course;
        }

        let canStartNextCourse = false;
        const currentCourseStartDate = moment(roadmap.currentCourseStartDate);
        const now = moment(Date.now());
        const currentCourseEndDate = moment(roadmap.currentCourseStartDate).add(currentCourse.minimumTimeNeeded, "days");

        const diffInDays = now.diff(currentCourseStartDate, "days");
        const willOpenIn = currentCourseEndDate.diff(now, "seconds") * 1000;
        if (diffInDays >= currentCourse.minimumTimeNeeded) canStartNextCourse = true;

        let userOnLastCourse = false;
        if (Object.keys(courses).length - 1 == Object.keys(courses).indexOf(roadmap.currentCourse.toString())) {
            userOnLastCourse = true;
        }

        return res.json({
            finishedCourses: roadmap.finishedCourses || [],
            currentCourse,
            currentCourseStartDate: roadmap.currentCourseStartDate,
            startDate: roadmap.startDate,
            canStartNextCourse,
            userOnLastCourse,
            willOpenIn,
            bundle,
        });
    }

    @Post("/activate-next-course")
    async activateNextCourse(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const roadmap = await this.UserRoadmapModel.findOne({ user: req.user.user._id, status: "active" }).exec();
        if (!roadmap) throw NotFoundException;

        const bundle = await this.BundleModel.findOne({ _id: roadmap.bundle }).exec();
        if (!bundle) throw NotFoundException;

        const courses = {};
        for (let i = 0; i < bundle.courses.length; i++) {
            courses[bundle.courses[i].course.toString()] = {
                _id: bundle.courses[i].course.toString(),
                course: bundle.courses[i].course,
                minimumTimeNeeded: bundle.courses[i].minimumTimeNeeded,
            };
        }

        // check if user can proceed to other course or not
        let canStartNextCourse = false;
        const currentCourseStartDate = moment(roadmap.currentCourseStartDate);
        const now = moment(Date.now());
        const diffInDays = now.diff(currentCourseStartDate, "days");
        if (diffInDays >= courses[roadmap.currentCourse.toString()].minimumTimeNeeded) canStartNextCourse = true;
        if (!canStartNextCourse) throw new UnprocessableEntityException([{ property: "roadmap", errors: ["زمان شروع دوره بعدی نرسیده!"] }]);

        // get next course id for new currentCourse
        const courseIds = Object.keys(courses);
        const nextCourseIndex = courseIds.indexOf(roadmap.currentCourse.toString()) + 1;
        if (courseIds.length - 1 < nextCourseIndex) {
            throw new UnprocessableEntityException([{ property: "roadmap", errors: ["دوره دیگری در این نقشه راه وجود ندارد"] }]);
        }
        const nextCourseId: any = courseIds[nextCourseIndex];

        await this.UserRoadmapModel.updateOne(
            { _id: roadmap._id },
            { finishedCourses: [...roadmap.finishedCourses, roadmap.currentCourse], currentCourse: nextCourseId, currentCourseStartDate: new Date(Date.now()) },
        ).exec();

        const currentCourseEndDate = moment(Date.now()).add(courses[nextCourseId].minimumTimeNeeded, "days");
        const willOpenIn = currentCourseEndDate.diff(now, "seconds") * 1000;

        return res.json({
            finishedCourses: [...roadmap.finishedCourses, roadmap.currentCourse],
            currentCourse: courses[nextCourseId],
            currentCourseStartDate: new Date(Date.now()),
            canStartNextCourse: false,
            willOpenIn,
        });
    }

    @Post("/finish-roadmap")
    async finishRoadmap(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const roadmap = await this.UserRoadmapModel.findOne({ user: req.user.user._id, status: "active" }).exec();
        if (!roadmap) throw NotFoundException;

        const bundle = await this.BundleModel.findOne({ _id: roadmap.bundle }).exec();
        if (!bundle) throw NotFoundException;

        const courses = {};
        for (let i = 0; i < bundle.courses.length; i++) {
            courses[bundle.courses[i].course.toString()] = {
                _id: bundle.courses[i].course.toString(),
                course: bundle.courses[i].course,
                minimumTimeNeeded: bundle.courses[i].minimumTimeNeeded,
            };
        }

        // check if current course is last course
        const courseIds = Object.keys(courses);
        if (courseIds[courseIds.length - 1].toString() != roadmap.currentCourse.toString()) {
            throw new UnprocessableEntityException([{ property: "roadmap", errors: ["شما هنوز به دوره آخر نرسیده اید"] }]);
        }

        // check if the minimum time is passed
        let canFinishRoadmap = false;
        const currentCourseStartDate = moment(roadmap.currentCourseStartDate);
        const now = moment(Date.now());
        const diffInDays = now.diff(currentCourseStartDate, "days");
        if (diffInDays >= courses[roadmap.currentCourse.toString()].minimumTimeNeeded) canFinishRoadmap = true;
        if (!canFinishRoadmap) throw new UnprocessableEntityException([{ property: "roadmap", errors: ["حداقل زمان دوره آخر به پایان نرسیده"] }]);

        await this.UserRoadmapModel.updateOne(
            { _id: roadmap._id },
            { finishedCourses: [...roadmap.finishedCourses, roadmap.currentCourse], status: "finished", finishDate: new Date(Date.now()) },
        ).exec();

        let discountGift = null;
        // check if bundle include a gift
        if (bundle.giftCodePercent > 0) {
            const discountCode = randStr(8);
            const giftCodeDeadline = moment().add(bundle.giftCodeDeadline, "days").toDate();
            const discount = await this.DiscountModel.create({
                name: "کد هدیه اتمام نقشه راه",
                code: discountCode,
                amount: bundle.giftCodePercent,
                amountType: "percent",
                type: "code",
                status: "active",
                startDate: new Date(Date.now()),
                endDate: giftCodeDeadline,
                emmitTo: "singleUser",
                emmitToId: req.user.user._id,
            });
            await this.UserRoadmapModel.updateOne({ _id: roadmap._id }, { discount: discount._id }).exec();

            discountGift = {
                percent: bundle.giftCodePercent,
                code: discountCode,
                expireDate: giftCodeDeadline,
            };
        }

        return res.json({ discountGift });
    }
}