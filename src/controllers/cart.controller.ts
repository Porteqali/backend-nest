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
import { CourseAnalyticDocument } from "src/models/courseAnalytics.schema";
import { AnalyticsService } from "src/services/analytics.service";
import { BundleDocument } from "src/models/bundles.schema";
import { loadUser } from "src/helpers/auth.helper";
import { AnalyticsCheckDocument } from "src/models/analyticsCheck.schema";

@Controller("")
export class CartController {
    constructor(
        private readonly discountService: DiscountService,
        private readonly cartService: CartService,
        private readonly marketingService: MarketingService,
        private readonly analyticsService: AnalyticsService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Bundle") private readonly BundleModel: Model<BundleDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("Discount") private readonly DiscountModel: Model<DiscountDocument>,
        @InjectModel("UserCourse") private readonly UserCourseModel: Model<UserCourseDocument>,
        @InjectModel("CourseAnalytic") private readonly CourseAnalyticModel: Model<CourseAnalyticDocument>,
        @InjectModel("AnalyticsCheck") private readonly AnalyticsCheckModel: Model<AnalyticsCheckDocument>,
    ) {}

    @Post("check-coupon-code")
    async checkCouponCode(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const code: string = req.body.couponCode.toString() || "";
        const today = new Date(Date.now());
        const error = "???? ?????????? ???????? ?????? ?????????? ???????? ???? ?????????? ??????";

        const discountCode = await this.DiscountModel.findOne({ type: "code", code: code, startDate: { $lte: today }, endDate: { $gte: today } }).exec();
        if (!discountCode) throw new UnprocessableEntityException([{ property: "discount", errors: [error] }]);

        if (discountCode.emmitTo == "singleUser") {
            const loadedUser = await loadUser(req);
            if (!loadedUser) throw new UnprocessableEntityException([{ property: "discount", errors: [error] }]);
            if (discountCode.emmitToId.toString() != loadedUser.user._id.toString()) {
                throw new UnprocessableEntityException([{ property: "discount", errors: [error] }]);
            }
        }

        return res.json({ code: discountCode.code, amount: discountCode.amount, amountType: discountCode.amountType });
    }

    @Post("cart-purchased-courses")
    async getPurchasedCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const list = req.body.list;
        let cart = {};

        try {
            cart = JSON.parse(list);
        } catch (e) {
            throw new UnprocessableEntityException([{ property: "cart", errors: ["???????????? ?????? ???????? ???????? ????????"] }]);
        }

        const courseIds = Object.keys(cart);
        const purcahsedCourses = await this.UserCourseModel.find({ user: req.user.user._id, course: { $in: courseIds }, status: "ok" })
            .populate("course", "_id image name price")
            .exec();

        const coursesToRemove = [];
        purcahsedCourses.forEach((userCourse) => coursesToRemove.push(userCourse.course));

        return res.json({ coursesToRemove });
    }

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
        const bundleId = req.body.bundleId;
        const couponCode = req.body.couponCode || "";
        let cart = {};
        let type = "list"; // list | bundle

        if (process.env.PAYMENT_IN_TEST == "true" && req.user.user.role != "admin") {
            throw new UnprocessableEntityException([
                { property: "cart", errors: ["?????????? ???????? ?????????? ???????? ?? ???????????? ???????? ???????????? ???????? ???? ???????????? ?????? ???????????? ???????????? ????????"] },
            ]);
        }

        let bundle = null;
        if (bundleId) bundle = await this.BundleModel.findOne({ _id: bundleId }).exec();

        try {
            if (list) cart = JSON.parse(list);
            else {
                for (let i = 0; i < bundle.courses.length; i++) cart[bundle.courses[i].course.toString()] = bundle.courses[i].course;
                type = "bundle";
            }
        } catch (e) {
            throw new UnprocessableEntityException([{ property: "cart", errors: ["???????????? ?????? ???????? ???????? ????????"] }]);
        }

        const courseIds = Object.keys(cart);
        // check if any of cart courses are not in user's course list
        const purcahsedCourses = await this.UserCourseModel.find({ user: req.user.user._id, course: { $in: courseIds }, status: "ok" }).exec();

        // remove any purcahse course from cart
        purcahsedCourses.forEach((purcahsedCourse) => {
            const index = courseIds.indexOf(purcahsedCourse.course.toString());
            if (index >= 0) courseIds.splice(index, 1);
        });

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

        if (type == "bundle") {
            cartInfo.payablePrice = cartInfo.payablePrice - cartInfo.payablePrice * (bundle.discountPercent / 100);
            for (let i = 0; i < cartInfo.courses.length; i++) {
                const discountedPrice = cartInfo.courses[i].discountInfo.discountedPrice;
                cartInfo.courses[i].discountInfo.discountedPrice = discountedPrice - discountedPrice * (bundle.discountPercent / 100);
            }
        }

        if (method == "wallet") {
            // check if user have enough money in wallet
            if (req.user.user.walletBalance < cartInfo.payablePrice) {
                throw new UnprocessableEntityException([{ property: "cart", errors: ["???????????? ?????? ?????? ?????? ???????? ????????!"] }]);
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
                "???????? ???????? ???? ???????? ???????????? ????????????",
                req.user.user.mobile,
            );
        } catch (e) {
            throw new UnprocessableEntityException([{ property: "cart", errors: ["?????? ???? ???????????? ?????????? ????????????"] }]);
        }
        if (!identifier || identifier == "") throw new UnprocessableEntityException([{ property: "cart", errors: ["?????? ???? ???????????? ???? ?????????? ????????????"] }]);

        // cancel any unpayed course
        // TODO: this is commented for testing
        // await this.UserCourseModel.updateMany({ course: { $in: courseIds }, status: "waiting_for_payment" }, { status: "cancel" }).exec();

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
                // change the purchased record status and save error
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
        let totalCuts = 0;
        for (let i = 0; i < userCourses.length; i++) {
            const userCourse = userCourses[i];
            if (userCourse.status != "waiting_for_payment") continue;

            // increase the buyCount of the course
            await this.CourseModel.updateOne({ _id: userCourse.course }, { $inc: { buyCount: 1 } }).exec();
            await this.CourseAnalyticModel.updateOne({ course: userCourse.course, type: "today" }, { $inc: { buyCount: 1 } }, { upsert: true }).exec();
            await this.CourseAnalyticModel.updateOne({ course: userCourse.course, type: "current-month" }, { $inc: { buyCount: 1 } }, { upsert: true }).exec();

            // calculate teacher cut and marketer cut
            let teacherCut = await this.cartService.calcTeacherCut(req, userCourse.course, userCourse.coursePayablePrice);
            let marketerCut = await this.marketingService.calcMarketerCut(req, userCourse.course, userCourse.marketer, userCourse.coursePayablePrice);

            totalCuts += teacherCut + marketerCut;

            await this.UserCourseModel.updateOne(
                { _id: userCourse._id },
                { status: "ok", transactionCode: transactionCode, paidAmount: userCourse.totalPrice, teacherCut: teacherCut, marketerCut: marketerCut },
            ).exec();

            await this.cartService.activateInRoadmap(req.user.user._id, userCourse.course);
        }

        if (userCourses[0].status == "waiting_for_payment") {
            // calculate the income for analytics
            await this.analyticsService.analyticCountUp(req, null, null, userCourses[0].totalPrice - totalCuts, "income", "total");
            
            // log for analyticCountUp
            try {
                await this.AnalyticsCheckModel.create({
                    authority: userCourses[0].authority,
                    totalPrice: userCourses[0].totalPrice,
                    totalCuts: totalCuts,
                    amountAdded: userCourses[0].totalPrice - totalCuts,
                    createdAt: new Date(Date.now()),
                });
            } catch (e) {
                console.log(`AnalyticsCheckModel create error:${e}`);
            }
        }

        if (method == "wallet") {
            const recentlyPurchasedCourses = await this.UserCourseModel.find({ authority: transactionResponse.identifier }, { status: "ok" })
                .select("paidAmount course")
                .exec();
            if (recentlyPurchasedCourses.length == 1 && recentlyPurchasedCourses[0].paidAmount == 0) {
                return res.json({ redirectUrl: `/course/${recentlyPurchasedCourses[0].course}` });
            }
        }

        return res.json({ redirectUrl: "/purchase-result?status=200&message=Success" });
    }
}
