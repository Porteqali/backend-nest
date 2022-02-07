import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CommentsController } from "src/controllers/comments.controller";
import { TestimonialsController } from "src/controllers/testimonials.controller";
import { ArticleSchema } from "src/models/articles.schema";
import { CommentSchema } from "src/models/comments.schema";
import { CourseSchema } from "src/models/courses.schema";
import { TestimonialSchema } from "src/models/testimonials.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "Comment", schema: CommentSchema },
            { name: "Testimonial", schema: TestimonialSchema },
            { name: "Article", schema: ArticleSchema },
            { name: "Course", schema: CourseSchema },
        ]),
    ],
    controllers: [CommentsController, TestimonialsController],
    providers: [],
    exports: [],
})
export class CommentsModule {}
