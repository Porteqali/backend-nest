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
import { PaymentGateway } from "src/paymentGateways/PaymentGateway";
import { MarketingService } from "src/services/marketing.service";

@Controller("")
export class CartController {
    constructor(
        private readonly discountService: DiscountService,
        private readonly cartService: CartService,
        private readonly marketingService: MarketingService,
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
        delete cartInfo.courses;
        return res.json(cartInfo);
    }

    @Post("course-payment")
    async payment(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const method = req.body.method || "wallet";
        const list = req.body.list;
        const couponCode = req.body.couponCode || "";
        let cart = {};

        if (process.env.PAYMENT_IN_TEST && req.user.user.role != "admin") {
            throw new UnprocessableEntityException([
                { property: "cart", errors: ["درحال حاضر امکان خرید و پرداخت وجود ندارد، لطفا در ساعاتی بعد دوباره امتحان کنید"] },
            ]);
        }

        try {
            cart = JSON.parse(list);
        } catch (e) {
            throw new UnprocessableEntityException([{ property: "cart", errors: ["ساختار سبد خرید صحیح نیست"] }]);
        }

        const courseIds = Object.keys(cart);
        // check if any of cart courses are not in user's course list
        const purcahsedCourses = await this.UserCourseModel.find({ course: { $in: courseIds }, status: "ok" }).exec();
        // remove any purcahse course from cart
        purcahsedCourses.forEach((purcahsedCourse) => courseIds.splice(courseIds.indexOf(purcahsedCourse.course), 1));

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

        if (method == "wallet") {
            // check if user have enough money in wallet
            if (req.user.user.walletBalance < cartInfo.payablePrice) {
                throw new UnprocessableEntityException([{ property: "cart", errors: ["اعتبار کیف پول شما کافی نیست!"] }]);
            }
        }

        // send a request to gateway and get the identifier
        const paymentGateway = new PaymentGateway(method, "course");
        let identifier = "";
        try {
            identifier = await paymentGateway.getIdentifier(
                paymentGateway.getApiKey(),
                cartInfo.payablePrice,
                `${process.env.PAYMENT_CALLBACK_BASE_URL}/course/${method}`,
                "خرید دوره از گروه آموزشی پرتقال",
                req.user.user.mobile,
            );
        } catch (e) {
            throw new UnprocessableEntityException([{ property: "cart", errors: ["خطا در دریافت شناسه پرداخت"] }]);
        }
        if (!identifier || identifier == "") throw new UnprocessableEntityException([{ property: "cart", errors: ["خطا در ارتباط با درگاه پرداخت"] }]);

        // cancel any unpayed course
        await this.UserCourseModel.updateMany({ course: { $in: courseIds }, status: "waiting_for_payment" }, { status: "cancel" }).exec();

        // create a course purchase records
        await this.cartService.submitCoursesForUser(req, cartInfo.courses, cartInfo.payablePrice, paymentGateway.getMethod(), identifier);

        // send back the identifier and gateway redirection url
        return res.json({ url: paymentGateway.getGatewayUrl(identifier) });
    }

    @Get("course-payment-callback/:method")
    async paymentCallback(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const method = req.params.method || null;
        if (!method) return res.json({ redirectUrl: "/purchase-result?status=422&message=NoMethod" });

        let transactionResponse = null;
        const paymentGateway = new PaymentGateway(method, "course");
        try {
            transactionResponse = paymentGateway.getTransactionResponse(req);
        } catch (e) {
            return res.json({ redirectUrl: "/purchase-result?status=405&message=MethodNotDefined" });
        }

        const userCourses = await this.UserCourseModel.find({ authority: transactionResponse.identifier }).exec();

        if (method == "wallet") {
            // check if user have enough money in wallet
            if (req.user.user.walletBalance < userCourses[0].totalPrice) {
                return res.json({ redirectUrl: "/purchase-result?status=421&message=WalletBalanceNotEnough" });
            }
        }

        if (transactionResponse.status != "OK") {
            // cancel the transaction and change its status and save the error
            await this.UserCourseModel.updateMany({ authority: transactionResponse.identifier }, { status: "cancel" }).exec();
            return res.json({ redirectUrl: "/purchase-result?status=417&message=TransactionCanceled" });
        }

        let verficationResponse = null;
        const transactionVerified = await paymentGateway
            .verify(paymentGateway.getApiKey(), transactionResponse.identifier, { amount: userCourses[0].totalPrice })
            .then(async (response) => {
                verficationResponse = response;
                if (response.status > 0) return true;
                else return false;
            })
            .catch(async (error) => {
                // change the booked record status and save error
                await this.UserCourseModel.updateMany({ authority: transactionResponse.identifier }, { status: "error", error: error.response || null }).exec();
                return false;
            });

        if (!transactionVerified) return res.json({ redirectUrl: "/purchase-result?status=412&message=TransactionFailedAndWillBounce" });

        if (method == "wallet") {
            // remove the paid amount from user's wallet balance
            await this.UserModel.updateOne(
                { _id: req.user.user._id },
                { walletBalance: Math.max(req.user.user.walletBalance - userCourses[0].totalPrice, 0) },
            ).exec();
        }

        const transactionCode = verficationResponse.transactionCode;
        for (let i = 0; i < userCourses.length; i++) {
            const userCourse = userCourses[i];
            if (userCourse.status != "waiting_for_payment") continue;

            // increase the buyCount of the course
            await this.CourseModel.updateOne({ _id: userCourse.course }, { $inc: { buyCount: 1 } });

            // calculate teacher cut and marketer cut
            let teacherCut = await this.cartService.calcTeacherCut(req, userCourse.course, userCourse.coursePayablePrice);
            let marketerCut = await this.marketingService.calcMarketerCut(req, userCourse.course, userCourse.marketer, userCourse.coursePayablePrice);

            await this.UserCourseModel.updateOne(
                { _id: userCourse._id },
                { status: "ok", transactionCode: transactionCode, paidAmount: userCourse.totalPrice, teacherCut: teacherCut, marketerCut: marketerCut },
            ).exec();
        }

        if (method == "wallet") {
            const recentlyPurchasedCourses = await this.UserCourseModel.find({ authority: transactionResponse.identifier }, { status: "ok" })
                .select("paidAmount course")
                .exec();
            if (recentlyPurchasedCourses.length == 1 && recentlyPurchasedCourses[0].paidAmount == 0) {
                return res.json({ redirectUrl: `/course/${recentlyPurchasedCourses[0].course}` });
            }
            console.log(recentlyPurchasedCourses[0]);
            console.log(recentlyPurchasedCourses[0].paidAmount);
            console.log(recentlyPurchasedCourses[0].paidAmount == 0);
        }

        return res.json({ redirectUrl: "/purchase-result?status=200&message=Success" });
    }
}
