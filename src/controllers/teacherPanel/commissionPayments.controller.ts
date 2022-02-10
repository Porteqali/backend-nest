import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { AuthService } from "src/services/auth.service";
import { CommissionPaymentDocument } from "src/models/commissionPayments.schema";

@Controller("teacher-panel/commission-payments")
export class CommissionPaymentsController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("CommissionPayment") private readonly CommissionPaymentModel: Model<CommissionPaymentDocument>,
    ) {}

    @Get("/")
    async getTeacherCommissionPaymentList(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "teacher", [], "AND"))) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "asc";
        switch (req.query.sort) {
            case "مبلغ پرداختی کمیسیون":
                sort = { payedAmount: sortType };
                break;
            case "مبلغ مانده کمیسیون":
                sort = { commissionAmountAfterPayment: sortType };
                break;
            case "شماره حساب | شماره کارت":
                sort = { cardNumber: sortType };
                break;
            case "بانک":
                sort = { bank: sortType };
                break;
            default:
                sort = { createdAt: sortType };
                break;
        }

        // the base query object
        let query = {
            user: new Types.ObjectId(req.user.user._id),
        };

        // filters
        // ...

        // making the model with query
        let data = this.CommissionPaymentModel.aggregate();
        data.match(query);
        data.sort(sort);
        data.project("commissionAmountBeforePayment payedAmount commissionAmountAfterPayment cardNumber bank createdAt");
        if (!!search) {
            data.match({
                $or: [
                    { commissionAmountBeforePayment: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { payedAmount: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { commissionAmountAfterPayment: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { cardNumber: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { bank: { $regex: new RegExp(`.*${search}.*`, "i") } },
                ],
            });
        }

        // paginating
        data = data.facet({
            data: [{ $skip: (page - 1) * pp }, { $limit: pp }],
            total: [{ $group: { _id: null, count: { $sum: 1 } } }],
        });

        // executing query and getting the results
        let error = false;
        const results = await data.exec().catch((e) => (error = true));
        if (error) throw new InternalServerErrorException();
        const total = results[0].total[0] ? results[0].total[0].count : 0;

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
        });
    }
}
