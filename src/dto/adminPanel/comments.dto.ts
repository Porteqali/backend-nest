import { IsEmail, IsNotEmpty, Length, IsString, IsIn } from "class-validator";

export class UpdateCommentDto {
    @Length(1, 1000, { message: "نظر کاربر حداکثر 1000 کاراکتر" })
    @IsString({ message: "نظر کاربر را وارد کنید" })
    @IsNotEmpty({ message: "نظر کاربر را وارد کنید" })
    readonly comment: string;

    @IsIn(["active", "deactive", "waiting_for_review"], { message: "وضعیت نامعتبر" })
    @IsString({ message: "یک وضعیت انتخاب کنید" })
    @IsNotEmpty({ message: "یک وضعیت انتخاب کنید" })
    readonly status: string;
}

export class ReplyToCommentDto {
    @Length(1, 1000, { message: "نظر حداکثر 1000 کاراکتر" })
    @IsString({ message: "نظر خود را وارد کنید" })
    @IsNotEmpty({ message: "نظر خود را وارد کنید" })
    readonly comment: string;
}
