import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { Model } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { CourseDocument } from "src/models/courses.schema";
import { DiscountDocument } from "src/models/discount.schema";
import { loadUser } from "src/helpers/auth.helper";

interface cartInfo {
    totalPrice: number;
    totalDiscount: number;
    totalDiscountPercent: number;
    payablePrice: number;
}

@Injectable()
export class CartService {
    constructor(
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("Discount") private readonly DiscountModel: Model<DiscountDocument>,
    ) {}

    // returns the total paybale price of given courses
    async cartTotal(req: Request, courses: Array<any>, couponCode: string): Promise<cartInfo> {
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
                coursesTotalDiscountedPrice += this.testCouponCode(courses[i], discountCode, courses[i].discountInfo.discountedPrice, loadedUser);
            } else coursesTotalDiscountedPrice += courses[i].discountInfo.discountedPrice;
        }

        // calc the discount percent and amount
        return {
            totalPrice: coursesTotalPrice,
            totalDiscount: coursesTotalPrice - coursesTotalDiscountedPrice,
            totalDiscountPercent: 100 - Math.round((coursesTotalDiscountedPrice / coursesTotalPrice) * 100),
            payablePrice: coursesTotalDiscountedPrice,
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
}
