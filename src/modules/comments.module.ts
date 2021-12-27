import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CommentsController } from "src/controllers/comments.controller";
import { TestimonialsController } from "src/controllers/testimonials.controller";
import { CommentSchema } from "src/models/comments.schema";
import { TestimonialSchema } from "src/models/testimonials.schema";

@Module({
    imports: [MongooseModule.forFeature([{ name: "Comment", schema: CommentSchema },{ name: "Testimonial", schema: TestimonialSchema }])],
    controllers: [CommentsController, TestimonialsController],
    providers: [],
    exports: [],
})
export class CommentsModule {}
