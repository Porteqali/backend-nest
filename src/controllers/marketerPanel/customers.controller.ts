import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import * as Jmoment from "jalali-moment";

@Controller("marketer-panel/customers")
export class CustomersController {
    constructor(private readonly authService: AuthService, @InjectModel("User") private readonly UserModel: Model<UserDocument>) {}

    @Get("/")
    async getMarketerCustomerList(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "marketer", [], "AND"))) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "asc";
        switch (req.query.sort) {
            case "کاربر":
                sort = { fullname: sortType };
                break;
            case "زمان ثبت نام":
                sort = { createdAt: sortType };
                break;
            case "دوره":
                sort = { period: sortType };
                break;
            case "زمان پایان دوره":
                sort = { endsAt: sortType };
                break;
        }

        // the base query object
        let query = {
            "registeredWith.marketer": new Types.ObjectId(req.user.user._id),
        };

        // filters
        // ...

        // making the model with query
        let data = this.UserModel.aggregate();
        data.match(query);
        data.sort(sort);
        data.project({
            image: 1,
            fullname: { $concat: ["$name", " ", "$family"] },
            period: "$registeredWith.period",
            endsAt: "$registeredWith.endsAt",
            createdAt: 1,
        });
        if (!!search) {
            data.match({
                $or: [
                    { fullname: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { period: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { endsAt: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { email: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { mobile: { $regex: new RegExp(`.*${search}.*`, "i") } },
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

        // transform data
        results[0].data.map((row) => {
            row.tillTheEnd = Jmoment(row.endsAt).locale("fa").fromNow();
            return row;
        });

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
        });
    }
}
