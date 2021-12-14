import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CommentsController } from "src/controllers/comments.controller";
import { CommentSchema } from "src/models/comments.schema";

@Module({
    imports: [MongooseModule.forFeature([{ name: "Comment", schema: CommentSchema }])],
    controllers: [CommentsController],
    providers: [],
    exports: [],
})
export class CommentsModule {}
