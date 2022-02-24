import { Controller, ForbiddenException, Get, InternalServerErrorException, Post, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CourseDocument } from "src/models/courses.schema";
import { UserDocument } from "src/models/users.schema";
import { duration } from "jalali-moment";
import { loadUser } from "src/helpers/auth.helper";
import { UserCourseDocument } from "src/models/userCourses.schema";
import { CourseRatingDocument } from "src/models/courseRatings.schema";
import { DiscountService } from "src/services/discount.service";

@Controller()
export class CoursesController {
    constructor(
        private readonly discountService: DiscountService,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("UserCourse") private readonly UserCourseModel: Model<UserCourseDocument>,
        @InjectModel("CourseRating") private readonly CourseRatingModel: Model<CourseRatingDocument>,
    ) {}

    @Get("/most-viewed-courses")
    async getMostViewdCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const courses: any = await this.CourseModel.find({ status: "active" })
            .select("-oid -exerciseFiles -tags -status -commission -topics.order -topics.file -topics.isFree -topics.isFreeForUsers")
            .populate("teacher", "image name family")
            .populate("groups", "-_id icon name topGroup")
            .sort({ viewCount: "desc" })
            .limit(10)
            .exec();

        // calculate the discount and tag
        for (let i = 0; i < courses.length; i++) {
            courses[i] = courses[i].toJSON();
            courses[i].discountInfo = await this.discountService.courseDiscount(req, courses[i]._id);
        }

        return res.json(courses);
    }

    @Get("/top-teachers")
    async getTopTeachers(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const teachersQuery = this.UserModel.aggregate();
        teachersQuery.match({ role: "teacher" });
        teachersQuery.limit(2);
        teachersQuery.lookup({
            from: "courses",
            let: { teacher_id: "$_id" },
            pipeline: [
                { $match: { $expr: { $and: [{ $eq: ["$teacher", "$$teacher_id"] }, { $eq: ["$status", "active"] }] } } },
                { $lookup: { from: "coursegroups", localField: "groups", foreignField: "_id", as: "groups" } },
                { $limit: 3 },
            ],
            as: "courses",
        });
        teachersQuery.project(
            "image title name family description socials courses._id courses.name courses.description courses.groups.icon courses.groups.name courses.topics",
        );

        let error = false;
        const teachers: any = await teachersQuery.exec().catch((e) => {
            console.log(e);
            error = true;
        });
        if (error) throw new InternalServerErrorException();

        for (let i = 0; i < teachers.length; i++) {
            teachers[i].courseCount = await this.CourseModel.countDocuments({ status: "active", teacher: teachers[i]._id }).exec();
            teachers[i].courses = teachers[i].courses.map((course) => {
                let seconds = 0;
                course.topics.forEach((topic) => {
                    seconds += parseInt(topic.time.hours) * 3600 + parseInt(topic.time.minutes) * 60 + parseInt(topic.time.seconds);
                });
                course.totalTime = duration(seconds * 1000)
                    .locale("fa")
                    .humanize();
                return course;
            });
        }

        return res.json(teachers);
    }

    @Get("/courses")
    async getCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 10;

        const search = req.query.search ? req.query.search.toString() : "";
        const order = req.query.order ? req.query.order.toString() : "";
        const group = req.query.group ? req.query.group.toString() : "";

        // the base query object
        let query = {
            status: "active",
        };
        if (!!group) {
            query["groups.topGroup"] = group;
        }

        // sort
        let sort = {};
        switch (order) {
            case "most-popular":
                sort["buyCount"] = "desc";
                break;
            case "oldest":
                sort["createdAt"] = "asc";
                break;
            default:
                sort["createdAt"] = "desc";
        }

        // making the model with query
        let data = this.CourseModel.aggregate();
        data.lookup({
            from: "coursegroups",
            localField: "groups",
            foreignField: "_id",
            as: "groups",
        });
        data.lookup({
            from: "users",
            localField: "teacher",
            foreignField: "_id",
            as: "teacher",
        });
        data.match(query);
        data.match({
            $or: [
                { name: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { description: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "teacher.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "teacher.family": { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "groups.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                { tags: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "topics.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
            ],
        });
        data.sort(sort);
        data.project("teacher._id teacher.image teacher.name teacher.family image name description price groups buyCount score topics.time");

        // paginating
        data = data.facet({
            data: [{ $skip: (page - 1) * pp }, { $limit: pp }],
            total: [{ $group: { _id: null, count: { $sum: 1 } } }],
        });

        // executing query and getting the results
        const results = await data.exec().catch((e) => {
            throw e;
        });
        const total = results[0].total[0] ? results[0].total[0].count : 0;

        // calculate the discount and tag
        for (let i = 0; i < results[0].data.length; i++) {
            results[0].data[i].discountInfo = await this.discountService.courseDiscount(req, results[0].data[i]._id);
        }

        // transform data
        results[0].data.map((row) => {
            let seconds = 0;
            row.topics.forEach((topic) => {
                seconds += parseInt(topic.time.hours) * 3600 + parseInt(topic.time.minutes) * 60 + parseInt(topic.time.seconds);
            });
            delete row.topics;
            row.totalTime = new Date(seconds * 1000).toUTCString().match(/(\d\d:\d\d:\d\d)/)[0];

            return row;
        });

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
        });
    }

    @Get("/suggested-courses")
    async getSuggestedCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const courses = await this.CourseModel.find({ status: "active" })
            .select("name groups topics")
            .populate("groups", "icon name topGroup")
            .sort({ createdAt: "desc" })
            .limit(7)
            .exec();

        return res.json(courses);
    }

    @Get("/course/:id")
    async getCourse(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const courseItem = await this.CourseModel.findOne({ _id: req.params.id, status: "active" })
            .select("-oid -status -commission")
            .populate("teacher", "image name family description")
            .populate("groups", "-_id icon name topGroup")
            .exec();
        if (!courseItem) return res.status(404).end();
        const course: any = courseItem.toJSON();
        course.canonical = `${process.env.FRONT_URL}/course/${course._id}/${course.name}`;

        // count the views
        await this.CourseModel.updateOne({ _id: req.params.id, status: "active" }, { viewCount: course.viewCount + 1 }).exec();

        const discountAndTag = await this.discountService.courseDiscount(req, course._id);
        course.discountInfo = discountAndTag;

        // check if user bougth the course
        const loadedUser = await loadUser(req);
        let purchased = false;
        if (!!loadedUser) purchased = await this.UserCourseModel.exists({ user: loadedUser.user._id, course: course._id, status: "ok" });

        course.topics = course.topics.map((topic: any) => {
            topic.canPlay = false;
            if (topic.isFree) topic.canPlay = true;
            if (topic.isFreeForUsers && !!loadedUser) topic.canPlay = true;
            if (purchased) topic.canPlay = true;
            return topic;
        });

        const numberOfVotes = await this.CourseRatingModel.countDocuments({ course: course._id }).exec();
        const numberOfTopVotes = await this.CourseRatingModel.countDocuments({ course: course._id, rating: 8 }).exec();

        let userScore = 0;
        if (!!loadedUser) {
            // if user logged in and did rated the course get it and send it into front
            const courseRating = await this.CourseRatingModel.findOne({ user: loadedUser.user._id, course: course._id }).exec();
            if (courseRating) userScore = courseRating.rating;
        }

        const similarCourses = await this.CourseModel.find({ tags: { $in: course.tags || [] }, _id: { $ne: course._id }, status: "active" })
            .select("-oid -exerciseFiles -tags -status -commission -topics.order -topics.file -topics.isFree -topics.isFreeForUsers")
            .populate("teacher", "image name family")
            .populate("groups", "-_id icon name topGroup")
            .sort({ createdAt: "desc" })
            .limit(10)
            .exec();

        return res.json({ course, purchased, similarCourses, numberOfVotes, numberOfTopVotes, userScore, discountAndTag });
    }

    @Post("/course/:id/score")
    async giveCourseScore(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        let newScore = 0;
        const score = req.body.score;
        if (!score) throw new ForbiddenException();
        if (!req.user) throw new ForbiddenException();

        const course = await this.CourseModel.findOne({ _id: req.params.id, status: "active" }).exec();
        if (!course) throw new ForbiddenException();

        let purchased = await this.UserCourseModel.exists({ user: req.user.payload["user_id"], course: course._id, status: "ok" });
        if (!purchased) throw new ForbiddenException();

        const totalVotes = await this.CourseRatingModel.countDocuments({ course: course._id }).exec();
        const scoreSum = totalVotes * course.score;

        const courseRating = await this.CourseRatingModel.findOne({ user: req.user.payload["user_id"], course: course._id }).exec();
        if (courseRating) {
            // if score is an update
            // we can find the persons old rating and calc the difrentional then add it to the multiply of total votes in current score and devide it to total vote
            let dif = score - courseRating.rating;
            newScore = (scoreSum + dif) / totalVotes;
        } else {
            // if score is new
            // we can multiply the number of votes in current score and add user score to it then devide it by old vote count +1
            newScore = (scoreSum + score) / (totalVotes + 1);
        }

        await this.CourseRatingModel.updateOne({ user: req.user.payload["user_id"], course: course._id }, { rating: score }, { upsert: true });
        await this.CourseModel.updateOne({ _id: course._id, status: "active" }, { score: newScore }).exec();

        return res.json({ newScore });
    }
}
