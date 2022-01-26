import { IsEmail, IsNotEmpty, Length, IsString, IsIn, IsOptional, IsPhoneNumber, IsDateString } from "class-validator";

export class UpdateUserDto {
    @IsOptional()
    readonly image?: string;

    @Length(1, 100, { message: "نام حداکثر 100 کاراکتر" })
    @IsString({ message: "نام ادمین را وارد کنید" })
    @IsNotEmpty({ message: "نام ادمین را وارد کنید" })
    readonly name: string;

    @Length(1, 100, { message: "نام خانوادگی حداکثر 100 کاراکتر" })
    @IsString({ message: "نام ادمین را وارد کنید" })
    @IsNotEmpty({ message: "نام ادمین را وارد کنید" })
    readonly family: string;

    @IsEmail({ message: "ایمیل ادمین نامعتبر" })
    @IsString({ message: "ایمیل ادمین را وارد کنید" })
    @IsNotEmpty({ message: "ایمیل ادمین را وارد کنید" })
    readonly email: string;

    @IsIn(["true", "false"], { message: "فرمت تایید ایمیل معتبر نیست" })
    readonly emailVerified: string;

    @IsPhoneNumber("IR", { message: "شماره موبایل را وارد کنید" })
    @IsNotEmpty({ message: "شماره موبایل را وارد کنید" })
    readonly mobile: string;

    @IsIn(["true", "false"], { message: "فرمت تایید شماره موبایل معتبر نیست" })
    readonly mobileVerified: string;

    @IsIn(["active", "deactive"], { message: "وضعیت نامعتبر" })
    @IsString({ message: "یک وضعیت انتخاب کنید" })
    @IsNotEmpty({ message: "یک وضعیت انتخاب کنید" })
    readonly status: string;

    @IsOptional()
    @Length(8, 100, { message: "رمزعبور حداقل باید 8 کاراکتر باشد" })
    @IsString({ message: "رمزعبور را وارد کنید" })
    readonly password?: string;

    @IsOptional()
    @IsString({ message: "تکرار رمزعبور را وارد کنید" })
    readonly passwordConfirmation?: string;
}

export class ExportUserDto {
    @IsOptional()
    @IsDateString()
    readonly startDate?: string;

    @IsOptional()
    @IsDateString()
    readonly endDate?: string;

    @IsOptional()
    @IsString()
    readonly selectedCourses?: string;

    @IsIn(["true", "false"])
    readonly mobileField: string;

    @IsIn(["true", "false"])
    readonly emailField: string;
}
