import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ArticlesController } from "src/controllers/articles.controller";
import { ArticlesImporter } from "src/importer/articles.importer";
import { ArticleCategorySchema } from "src/models/articleCategories.schema";
import { ArticleSchema } from "src/models/articles.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "Article", schema: ArticleSchema },
            { name: "ArticleCategory", schema: ArticleCategorySchema },
        ]),
    ],
    controllers: [ArticlesController, ArticlesImporter],
    providers: [],
    exports: [],
})
export class ArticlesModule {}
