import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Request } from "src/interfaces/Request";
import { Model } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { Course, CourseDocument } from "src/models/courses.schema";
import { DiscountDocument } from "src/models/discount.schema";
import { loadUser } from "src/helpers/auth.helper";
import { UserCourseDocument } from "src/models/userCourses.schema";
import { courseDiscountOutput } from "./discount.service";
import { MarketingService } from "./marketing.service";
import { CommissionDocument } from "src/models/commissions.schema";
import { AnalyticsService } from "./analytics.service";

interface cartInfo {
    totalPrice: number;
    totalDiscount: number;
    totalDiscountPercent: number;
    payablePrice: number;
    courses: Array<ElevatedCourse>;
}

interface ElevatedCourse extends Course {
    discountInfo: courseDiscountOutput;
}

@Injectable()
export class CartService {
    constructor(
        private readonly marketingService: MarketingService,
        private readonly analyticsService: AnalyticsService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("Discount") private readonly DiscountModel: Model<DiscountDocument>,
        @InjectModel("UserCourse") private readonly UserCourseModel: Model<UserCourseDocument>,
        @InjectModel("Commission") private readonly CommissionModel: Model<CommissionDocument>,
    ) {}

    // returns the total paybale price of given courses
    async cartTotal(req: Request, courses: Array<ElevatedCourse>, couponCode: string): Promise<cartInfo> {
        const loadedUser = await loadUser(req);

        // check if user registered any coupon code or not
        let discountCode = null;
        if (couponCode != "") {
            // get the coupon code if available
            discountCode = await this.DiscountModel.findOne({
                type: "code",
                code: couponCode,
                startDate: { $lte: new Date(Date.now()) },
                endDate: { $gte: new Date(Date.now()) },
            }).exec();
        }

        // for each course apply the coupon code if it can apply to that course and compare the price
        let coursesTotalPrice = 0;
        let coursesTotalDiscountedPrice = 0;
        for (let i = 0; i < courses.length; i++) {
            coursesTotalPrice += courses[i].price;
            if (discountCode) {
                const oldDiscountedPrice = courses[i].discountInfo.discountedPrice;
                const newDiscountedPrice = this.testCouponCode(courses[i], discountCode, courses[i].discountInfo.discountedPrice, loadedUser);
                courses[i].discountInfo.discountAmount = 100 - Math.round((newDiscountedPrice / courses[i].price) * 100);
                courses[i].discountInfo.discountType = "percent";
                courses[i].discountInfo.discountedPrice = newDiscountedPrice;
                coursesTotalDiscountedPrice += newDiscountedPrice;
            } else coursesTotalDiscountedPrice += courses[i].discountInfo.discountedPrice;
        }

        // calc the discount percent and amount
        return {
            totalPrice: coursesTotalPrice,
            totalDiscount: coursesTotalPrice - coursesTotalDiscountedPrice,
            totalDiscountPercent: 100 - Math.round((coursesTotalDiscountedPrice / coursesTotalPrice) * 100),
            payablePrice: coursesTotalDiscountedPrice,
            courses,
        };
    }

    private testCouponCode(course, discount, currentDiscountetPrice, loadedUser) {
        // check if CouponCode can apply to this course or not, if it can then apply it
        switch (discount.emmitTo) {
            case "allCourses":
                return this.calcCouponDiscount(course.price, discount, currentDiscountetPrice);
                break;
            case "course":
                if (course._id == discount.emmitToId) return this.calcCouponDiscount(course.price, discount, currentDiscountetPrice);
                break;
            case "courseGroup":
                if (course.groups[0] == discount.emmitToId) return this.calcCouponDiscount(course.price, discount, currentDiscountetPrice);
                break;
            case "teacherCourses":
                if (course.teacher == discount.emmitToId) return this.calcCouponDiscount(course.price, discount, currentDiscountetPrice);
                break;
            case "singleUser":
                if (!!loadedUser && loadedUser.user._id == discount.emmitToId) return this.calcCouponDiscount(course.price, discount, currentDiscountetPrice);
                break;
        }
        return currentDiscountetPrice;
    }

    private calcCouponDiscount(coursePrice, discount, currentDiscountetPrice) {
        let discountedPrice = coursePrice;
        if (discount.amountType == "percent") discountedPrice = coursePrice - (coursePrice * discount.amount) / 100;
        else discountedPrice = coursePrice - discount.amount;
        // pick the lowest price possible for every course
        return Math.min(currentDiscountetPrice, discountedPrice);
    }

    // ========================================

    async submitCoursesForUser(req: Request, courses: Array<ElevatedCourse>, totalPrice: number, method, identifier): Promise<void> {
        let inserts = [];
        for (let i = 0; i < courses.length; i++) {
            const course = courses[i];

            // foreach course find the marketer and marketer course if any available
            const marketer = await this.marketingService.findMarketer(req, course._id);

            inserts.push({
                user: req.user.user._id,
                userFullname: `${req.user.user.name} ${req.user.user.family}`,
                course: course._id,
                courseName: course.name,
                marketer: marketer,
                teacherCut: 0,
                marketerCut: 0,
                coursePrice: course.price,
                coursePayablePrice: course.discountInfo.discountedPrice,
                totalPrice: totalPrice,
                paidAmount: 0,
                authority: identifier,
                paymentMethod: method,
                ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
            });
        }
        await this.UserCourseModel.insertMany(inserts);
    }

    async calcTeacherCut(req: Request, courseId: any, coursePrice: number): Promise<number> {
        const course = await this.CourseModel.findOne({ _id: courseId }).exec();
        if (!course) return 0;

        const teacher = await this.UserModel.findOne({ _id: course.teacher }).exec();
        if (!teacher) return 0;

        let commission = null;
        if (course.commission) commission = await this.CommissionModel.findOne({ _id: course.commission }).exec();
        else commission = await this.CommissionModel.findOne({ _id: teacher.commission }).exec();

        if (!commission) return 0;
        let teacherCut = 0;
        switch (commission.type) {
            case "percent":
                teacherCut = coursePrice - coursePrice * (commission.amount / 100);
                break;
            case "number":
                teacherCut = coursePrice - commission.amount;
                break;
        }

        // add teacherCut to him/her commission balance
        await this.UserModel.updateOne({ _id: teacher._id }, { commissionBalance: teacher.commissionBalance + teacherCut }).exec();

        await this.analyticsService.analyticCountUp(req, null, teacher._id, teacherCut, "income", "teacher");
        await this.analyticsService.analyticCountUp(req, null, teacher._id, 1, "sells", "teacher");

        return teacherCut;
    }
}
