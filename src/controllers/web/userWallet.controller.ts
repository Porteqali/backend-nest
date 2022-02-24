import { Body, Controller, Delete, Get, Post, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UserCourseDocument } from "src/models/userCourses.schema";
import { UserDocument } from "src/models/users.schema";
import { WalletTransactionDocument } from "src/models/walletTransactions.schema";
import { WalletChargeDto } from "src/dto/walletCharge.dto";
import { PaymentGateway } from "src/paymentGateways/PaymentGateway";

@Controller("")
export class UserWalletController {
    constructor(
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("WalletTransaction") private readonly WalletTransactionModel: Model<WalletTransactionDocument>,
    ) {}

    @Post("wallet-payment")
    async payment(@Body() inputs: WalletChargeDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const method = req.body.method || "zarinpal";
        const amount = parseInt(req.body.amount);

        if (process.env.PAYMENT_IN_TEST == "true" && req.user.user.role != "admin") {
            throw new UnprocessableEntityException([
                { property: "cart", errors: ["درحال حاضر امکان خرید و پرداخت وجود ندارد، لطفا در ساعاتی بعد دوباره امتحان کنید"] },
            ]);
        }

        if (amount < 10000) throw new UnprocessableEntityException([{ property: "cart", errors: ["حداقل میزان شارژ 10،000 تومان میباشد"] }]);

        // send a request to gateway and get the identifier
        const paymentGateway = new PaymentGateway(method, "wallet-charge");
        let identifier = "";
        try {
            identifier = await paymentGateway.getIdentifier(
                paymentGateway.getApiKey(),
                amount,
                `${process.env.PAYMENT_CALLBACK_BASE_URL}/wallet-charge/${method}`,
                "شارژ کیف پول در گروه آموزشی پرتقال",
                req.user.user.mobile,
            );
        } catch (e) {
            throw new UnprocessableEntityException([{ property: "cart", errors: ["خطا در دریافت شناسه پرداخت"] }]);
        }
        if (!identifier || identifier == "") throw new UnprocessableEntityException([{ property: "cart", errors: ["خطا در ارتباط با درگاه پرداخت"] }]);

        // save the identifier
        await this.WalletTransactionModel.create({
            user: req.user.user._id,
            userFullname: `${req.user.user.name} ${req.user.user.family}`,
            chargeAmount: amount,
            paidAmount: 0,
            authority: identifier,
            paymentMethod: method,
            ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
        });

        // send back the identifier and gateway redirection url
        return res.json({ url: paymentGateway.getGatewayUrl(identifier) });
    }

    @Get("wallet-payment-callback/:method")
    async paymentCallback(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const method = req.params.method || null;
        if (!method) return res.json({ redirectUrl: "/purchase-result?status=422&message=NoMethod" });

        let transactionResponse = null;
        const paymentGateway = new PaymentGateway(method, "wallet-charge");
        try {
            transactionResponse = paymentGateway.getTransactionResponse(req);
        } catch (e) {
            return res.json({ redirectUrl: "/purchase-result?status=405&message=MethodNotDefined" });
        }

        const walletTransaction = await this.WalletTransactionModel.findOne({ authority: transactionResponse.identifier }).exec();

        if (transactionResponse.status != "OK") {
            // cancel the transaction and change its status and save the error
            await this.WalletTransactionModel.updateMany({ authority: transactionResponse.identifier }, { status: "cancel" }).exec();
            return res.json({ redirectUrl: "/purchase-result?status=417&message=TransactionCanceled" });
        }

        let verficationResponse = null;
        const transactionVerified = await paymentGateway
            .verify(paymentGateway.getApiKey(), transactionResponse.identifier, { amount: walletTransaction.chargeAmount })
            .then(async (response) => {
                verficationResponse = response;
                if (response.status > 0) return true;
                else return false;
            })
            .catch(async (error) => {
                // change the booked record status and save error
                await this.WalletTransactionModel.updateOne(
                    { authority: transactionResponse.identifier },
                    { status: "error", error: error.response || null },
                ).exec();
                return false;
            });

        console.log(verficationResponse);
        console.log(transactionVerified);

        if (!transactionVerified) return res.json({ redirectUrl: "/purchase-result?status=412&message=TransactionFailedAndWillBounce" });

        if (walletTransaction.status != "waiting_for_payment") return res.json({ redirectUrl: "/purchase-result?status=413&message=TransactionIsDoneBefore" });

        const transactionCode = verficationResponse.transactionCode;
        await this.WalletTransactionModel.updateOne(
            { _id: walletTransaction._id },
            { status: "ok", transactionCode: transactionCode, paidAmount: walletTransaction.chargeAmount },
        ).exec();

        // add amount to wallet balance
        await this.UserModel.updateOne({ _id: req.user.user._id }, { walletBalance: parseInt(req.user.user.walletBalance) + walletTransaction.chargeAmount }).exec();

        return res.json({ redirectUrl: "/purchase-result?status=201&message=Success" });
    }
}
