import { IsEmail, IsNotEmpty, Length, IsString, IsPhoneNumber } from "class-validator";

export class SendContactRequestDto {
    @Length(1, 100, { message: "نام حداکثر 100 کاراکتر" })
    @IsString({ message: "نام خود را وارد کنید" })
    @IsNotEmpty({ message: "نام خود را وارد کنید" })
    readonly name: string;

    @Length(1, 100, { message: "نام خانوادگی حداکثر 100 کاراکتر" })
    @IsString({ message: "نام خانوادگی خود را وارد کنید" })
    @IsNotEmpty({ message: "نام خانوادگی خود را وارد کنید" })
    readonly family: string;

    @IsPhoneNumber("IR", { message: "شماره همراه خود را وارد کنید" })
    @IsNotEmpty({ message: "شماره همراه خود را وارد کنید" })
    readonly mobile: string;

    @IsEmail({ message: "فرمت ایمیل صحیح نیست" })
    @IsNotEmpty({ message: "ایمیل خود را وارد کنید" })
    readonly email: string;

    @Length(1, 100, { message: "موضوع پیام حداکثر 100 کاراکتر" })
    @IsString({ message: "موضوع پیام را وارد کنید" })
    @IsNotEmpty({ message: "موضوع پیام را وارد کنید" })
    readonly issue: string;

    @Length(1, 1000, { message: "متن پیام حداکثر 1000 کاراکتر" })
    @IsString({ message: "متن پیام خود را وارد کنید" })
    @IsNotEmpty({ message: "متن پیام خود را وارد کنید" })
    readonly text: string;
}
