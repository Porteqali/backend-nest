import { Body, Controller, Get, Post, Req, Res, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

@Controller("metadata")
export class MetadataController {
    constructor() {}

    @Get("/:page")
    async getMetadataForPage(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        // TOOD
        // find the page inside the db and get its metadata

        // home
        // blog
        // contact-us
        // about-us
        // privacy-policy
        // terms-and-conditions
        // department
        // teachers
        // work-with-us
        // faqs

        return res.json({
            title: "حریم خصوصی - گروه آموزشی پرتقال",
            meta: [
                { hid: "description", name: "description", content: "" },
                { hid: "language", name: "language", content: "fa" },
                { hid: "keywords", name: "keywords", content: "fa" },

                { hid: "twitter:card", name: "twitter:card", content: "summary_large_image" },
                { hid: "twitter:site", name: "twitter:site", content: "https://porteqali.com/" },
                { hid: "twitter:description", name: "twitter:description", content: "" },
                { hid: "twitter:title", name: "twitter:title", content: "حریم خصوصی - گروه آموزشی پرتقال" },
                { hid: "twitter:image", name: "twitter:image", content: "https://agah-lawyers.com/img/icons/android-chrome-192x192.png" },

                { hid: "robots", name: "robots", content: "max-image-preview:large" },
                { hid: "mobile-web-app-capable", name: "mobile-web-app-capable", content: "yes" },
                { hid: "msapplication-TileColor", name: "msapplication-TileColor", content: "#f5f5f5" },
                { hid: "theme-color", name: "theme-color", content: "#f5f5f5" },
            ],
            link: [
                { rel: "canonical", href: "https://porteqali.com/" },
                { rel: "apple-touch-icon", sizes: "180x180", href: "/favicon.ico" },
                { rel: "shortcut icon", type: "image/x-icon", href: "/favicon.ico" },
            ],
        });
    }
}
