import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ArticlesController } from "src/controllers/articles.controller";
import { ArticleCategorySchema } from "src/models/articleCategories.schema";
import { ArticleLikeSchema } from "src/models/articleLikes.schema";
import { ArticleSchema } from "src/models/articles.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "Article", schema: ArticleSchema },
            { name: "ArticleCategory", schema: ArticleCategorySchema },
            { name: "ArticleLike", schema: ArticleLikeSchema },
        ]),
    ],
    controllers: [ArticlesController],
    providers: [],
    exports: [],
})
export class ArticlesModule {}
