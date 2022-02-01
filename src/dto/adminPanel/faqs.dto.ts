import { IsEmail, IsNotEmpty, Length, IsString, IsIn, IsOptional, IsNumberString } from "class-validator";

export class CreateNewFaqDto {
    @Length(1, 1000, { message: "سوال حداکثر 1000 کاراکتر" })
    @IsString({ message: "سوال را وارد کنید" })
    @IsNotEmpty({ message: "سوال را وارد کنید" })
    readonly question: string;

    @Length(1, 1000, { message: "جواب سوال حداکثر 1000 کاراکتر" })
    @IsString({ message: "جواب سوال را وارد کنید" })
    @IsNotEmpty({ message: "جواب سوال را وارد کنید" })
    readonly answer: string;

    @IsIn(["education", "support", "collab", "wallet"], { message: "گروه نامعتبر" })
    @IsString({ message: "یک گروه انتخاب کنید" })
    @IsNotEmpty({ message: "یک گروه انتخاب کنید" })
    readonly group: string;

    @IsIn(["published", "pending"], { message: "وضعیت نامعتبر" })
    @IsString({ message: "یک وضعیت انتخاب کنید" })
    @IsNotEmpty({ message: "یک وضعیت انتخاب کنید" })
    readonly status: string;
}

export class UpdateFaqDto {
    @Length(1, 1000, { message: "سوال حداکثر 1000 کاراکتر" })
    @IsString({ message: "سوال را وارد کنید" })
    @IsNotEmpty({ message: "سوال را وارد کنید" })
    readonly question: string;

    @Length(1, 1000, { message: "جواب سوال حداکثر 1000 کاراکتر" })
    @IsString({ message: "جواب سوال را وارد کنید" })
    @IsNotEmpty({ message: "جواب سوال را وارد کنید" })
    readonly answer: string;

    @IsIn(["education", "support", "collab", "wallet"], { message: "گروه نامعتبر" })
    @IsString({ message: "یک گروه انتخاب کنید" })
    @IsNotEmpty({ message: "یک گروه انتخاب کنید" })
    readonly group: string;

    @IsIn(["published", "pending"], { message: "وضعیت نامعتبر" })
    @IsString({ message: "یک وضعیت انتخاب کنید" })
    @IsNotEmpty({ message: "یک وضعیت انتخاب کنید" })
    readonly status: string;
}
