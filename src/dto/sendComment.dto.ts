import { IsNotEmpty, Length, IsString, IsIn, IsMongoId } from "class-validator";

export class SendCommentDto {
    @Length(1, 500, { message: "متن پیام حداکثر 500 کاراکتر" })
    @IsNotEmpty({ message: "متن پیام خود را وارد کنید" })
    @IsString({ message: "متن پیام خود را وارد کنید" })
    readonly text: string;

    @IsIn(["article", "course"], { message: "امکان ارسال نظر وجود ندارد" })
    @IsNotEmpty({ message: "نوع پیام خود را مشخص کنید" })
    @IsString({ message: "نوع پیام خود را مشخص کنید" })
    readonly type: string;

    @IsMongoId({ message: "امکان ارسال نظر وجود ندارد" })
    @IsNotEmpty({ message: "نوع پیام خود را مشخص کنید" })
    readonly commentedOn: string;

    @IsMongoId({ message: "امکان ارسال نظر وجود ندارد" })
    @IsNotEmpty({ message: "نوع پیام خود را مشخص کنید" })
    readonly topComment?: string;
}
