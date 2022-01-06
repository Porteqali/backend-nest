import { Body, Controller, Get, Post, Req, Res, UnprocessableEntityException } from "@nestjs/common";
import { Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { CourseDocument } from "src/models/courses.schema";
import { DiscountDocument } from "src/models/discount.schema";
import { DiscountService } from "src/services/discount.service";
import { CartService } from "src/services/cart.service";
import { UserCourseDocument } from "src/models/userCourses.schema";

@Controller("")
export class CartController {
    constructor(
        private readonly discountService: DiscountService,
        private readonly cartService: CartService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("Discount") private readonly DiscountModel: Model<DiscountDocument>,
        @InjectModel("UserCourse") private readonly UserCourseModel: Model<UserCourseDocument>,
    ) {}

    @Post("cart-total")
    async calcCartTotal(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const list = req.body.list;
        const couponCode = req.body.couponCode || "";
        let cart = {};

        try {
            cart = JSON.parse(list);
        } catch (e) {
            throw new UnprocessableEntityException();
        }

        const courseIds = Object.keys(cart);
        const courses: any = await this.CourseModel.find({ _id: { $in: courseIds }, status: "active" })
            .select("-commission -topics")
            .exec();

        // calculate the discount
        for (let i = 0; i < courses.length; i++) {
            courses[i] = courses[i].toJSON();
            courses[i].discountInfo = await this.discountService.courseDiscount(req, courses[i]._id);
        }

        const cartInfo = await this.cartService.cartTotal(req, courses, couponCode);
        return res.json(cartInfo);
    }

    @Post("payment")
    async payment(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const method = req.body.method || "wallet";
        const list = req.body.list;
        const couponCode = req.body.couponCode || "";
        let cart = {};

        try {
            cart = JSON.parse(list);
        } catch (e) {
            throw new UnprocessableEntityException([{ property: "cart", errors: ["ساختار سبد خرید صحیح نیست"] }]);
        }

        const courseIds = Object.keys(cart);
        // check if any of cart courses are not in user's course list
        const purcahsedCourses = await this.UserCourseModel.find({ course: { $in: courseIds }, status: "ok" }).exec();
        // TODO
        // remove any purcahse course from cart

        const courses: any = await this.CourseModel.find({ _id: { $in: courseIds }, status: "active" })
            .select("-commission -topics")
            .exec();

        // calculate the discount
        for (let i = 0; i < courses.length; i++) {
            courses[i] = courses[i].toJSON();
            courses[i].discountInfo = await this.discountService.courseDiscount(req, courses[i]._id);
        }
        // calc cart total
        const cartInfo = await this.cartService.cartTotal(req, courses, couponCode);

        // check if user want to pay with wallet or gateway
        if (method == "wallet") {
            // TODO
        }

        // TODO
        // send a request to gateway and get the identifier
        // create a course purchase record
        // send back the identifier and gateway redirection url
    }

    @Get("payment-callback")
    async paymentCallback(@Req() req: Request, @Res() res: Response): Promise<void | Response> {}
}
