import { Controller, Get, Post, Req, Res, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { SearchService } from "src/services/search.service";

@Controller("search")
export class SearchController {
    constructor(private readonly searchService: SearchService) {}

    @Get("/:query")
    async getSearchResults(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!req.params.query) throw new UnprocessableEntityException();
        const search: string = req.params.query.toString() || "";

        const section = req.query.section ? req.query.section.toString() : "";

        switch (section) {
            case "article":
                await this.searchService.searchArticles(req, res, search);
                break;
            case "teacher":
                await this.searchService.searchTeachers(req, res, search);
                break;
            default:
                await this.searchService.searchCourses(req, res, search);
                break;
        }

        return res.json({});
    }
}
