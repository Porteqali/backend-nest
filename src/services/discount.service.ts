import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { Model } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { CourseDocument } from "src/models/courses.schema";
import { DiscountDocument } from "src/models/discount.schema";
import { loadUser } from "src/helpers/auth.helper";

export interface courseDiscountOutput {
    discountAmount: number;
    discountType: string;
    discountedPrice: number;
    tag: string;
}

@Injectable()
export class DiscountService {
    constructor(
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("Discount") private readonly DiscountModel: Model<DiscountDocument>,
    ) {}

    // returns the course discount amount and type + tag title
    async courseDiscount(req: Request, courseId): Promise<courseDiscountOutput> {
        const course = await this.CourseModel.findOne({ _id: courseId }).exec();
        const courseGroupId: any = course.groups[0];
        const courseTeacherId: any = course.teacher;

        const loadedUser = await loadUser(req);

        let baseQuery = {
            type: "onCourse",
            status: "active",
            startDate: { $lte: new Date(Date.now()) },
            endDate: { $gte: new Date(Date.now()) },
        };

        // check if there is any discount on all courses
        let discountAllCourses = await this.getDiscount({ ...baseQuery, emmitTo: "allCourses" });

        // check if there is any discount on this single course
        let discountSingleCourse = await this.getDiscount({ ...baseQuery, emmitTo: "course", emmitToId: course._id });

        // check if there is any discount on this course's group
        let discountCourseGroup = null;
        if (courseGroupId) discountCourseGroup = await this.getDiscount({ ...baseQuery, emmitTo: "courseGroup", emmitToId: courseGroupId });

        // check if there is any discount on this course's teacher
        let discountTeacherCourses = await this.getDiscount({ ...baseQuery, emmitTo: "teacherCourses", emmitToId: courseTeacherId });

        // check if there is any discount on this logged in user
        let discountSingleUser = null;
        if (!!loadedUser) discountSingleUser = await this.getDiscount({ ...baseQuery, emmitTo: "singleUser", emmitToId: loadedUser.user._id });

        // ================================================

        // convert all discounts to the amount that will reduced from course price and compare them
        let discountAllCoursesPrice = course.price;
        if (!!discountAllCourses) discountAllCoursesPrice = this.calcDiscount(discountAllCourses, course.price);

        let discountSingleCoursePrice = course.price;
        if (!!discountSingleCourse) discountSingleCoursePrice = this.calcDiscount(discountSingleCourse, course.price);

        let discountCourseGroupPrice = course.price;
        if (!!discountCourseGroup) discountCourseGroupPrice = this.calcDiscount(discountCourseGroup, course.price);

        let discountTeacherCoursesPrice = course.price;
        if (!!discountTeacherCourses) discountTeacherCoursesPrice = this.calcDiscount(discountTeacherCourses, course.price);

        let discountSingleUserPrice = course.price;
        if (!!discountSingleUser) discountSingleUserPrice = this.calcDiscount(discountSingleUser, course.price);

        let maxDiscountPrice = Math.min(
            discountAllCoursesPrice,
            discountSingleCoursePrice,
            discountCourseGroupPrice,
            discountTeacherCoursesPrice,
            discountSingleUserPrice,
        );

        let discount = { discountAmount: 0, discountType: "percent", discountedPrice: course.price };
        switch (maxDiscountPrice) {
            case discountAllCoursesPrice:
                if (discountAllCourses)
                    discount = {
                        discountAmount: discountAllCourses.amount,
                        discountType: discountAllCourses.amountType,
                        discountedPrice: discountAllCoursesPrice,
                    };
                break;
            case discountSingleCoursePrice:
                if (discountSingleCourse)
                    discount = {
                        discountAmount: discountSingleCourse.amount,
                        discountType: discountSingleCourse.amountType,
                        discountedPrice: discountSingleCoursePrice,
                    };
                break;
            case discountCourseGroupPrice:
                if (discountCourseGroup)
                    discount = {
                        discountAmount: discountCourseGroup.amount,
                        discountType: discountCourseGroup.amountType,
                        discountedPrice: discountCourseGroupPrice,
                    };
                break;
            case discountTeacherCoursesPrice:
                if (discountTeacherCourses)
                    discount = {
                        discountAmount: discountTeacherCourses.amount,
                        discountType: discountTeacherCourses.amountType,
                        discountedPrice: discountTeacherCoursesPrice,
                    };
                break;
            case discountSingleUserPrice:
                if (discountSingleUser)
                    discount = {
                        discountAmount: discountSingleUser.amount,
                        discountType: discountSingleUser.amountType,
                        discountedPrice: discountSingleUserPrice,
                    };
                break;
        }

        // also return the tag message
        let tag = "";
        if (course.price == 0) tag = "رایگان";
        if (course.showInNew) tag = "جدید";
        if (discount.discountAmount > 0) tag = `${discount.discountAmount}${discount.discountType == "percent" ? "%" : "تومان"}`;

        return { ...discount, tag };
    }

    private async getDiscount(query) {
        return await this.DiscountModel.findOne(query).sort({ createdAt: "desc" }).exec();
    }

    private calcDiscount(discount, coursePrice) {
        let discountedPrice = coursePrice;
        if (discount.amountType == "percent") discountedPrice = coursePrice - (coursePrice * discount.amount) / 100;
        else discountedPrice = coursePrice - discount.amount;
        return discountedPrice;
    }
}
