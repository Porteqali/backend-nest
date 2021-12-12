import { IsNotEmpty, Length, IsString, MinLength } from "class-validator";

export class RegisterDto {
    @IsNotEmpty({ message: "ایمیل یا شماره همراه خود را وارد کنید" })
    readonly username: string;

    @Length(6, 6, { message: "کد نامعتبر" })
    @IsString({ message: "کد ارسال شده را وارد کنید" })
    @IsNotEmpty({ message: "کد ارسال شده را وارد کنید" })
    readonly code: string;
    
    @Length(1, 100, { message: "نام حداکثر 100 کاراکتر" })
    @IsString({ message: "نام خود را وارد کنید" })
    @IsNotEmpty({ message: "نام خود را وارد کنید" })
    readonly name: string;

    @Length(1, 100, { message: "نام خانوادگی حداکثر 100 کاراکتر" })
    @IsString({ message: "نام خانوادگی خود را وارد کنید" })
    @IsNotEmpty({ message: "نام خانوادگی خود را وارد کنید" })
    readonly family: string;

    @MinLength(8, { message: "رمزعبور حداقل 8 کاراکتر میباشد" })
    @IsString({ message: "رمزعبور برای حساب خود انتخاب کنید" })
    @IsNotEmpty({ message: "رمزعبور برای حساب خود انتخاب کنید" })
    readonly password: string;

    @IsNotEmpty({ message: "رمزعبورها باهم همخوانی ندارند" })
    readonly passwordConfirmation: string;
}
