import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from "class-validator";

export class VerifyDto {
    @IsNotEmpty({ message: "ایمیل یا شماره همراه خود را وارد کنید" })
    readonly username: string;

    @Length(6, 6, { message: "کد نامعتبر" })
    @IsString({ message: "کد ارسال شده را وارد کنید" })
    @IsNotEmpty({ message: "کد ارسال شده را وارد کنید" })
    readonly code: string;
}
