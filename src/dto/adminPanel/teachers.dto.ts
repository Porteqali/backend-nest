import { IsEmail, IsNotEmpty, Length, IsString, IsArray, IsIn, IsOptional, IsNumberString, IsPhoneNumber } from "class-validator";

export class CreateNewTeacherDto {
    @Length(1, 100, { message: "نام حداکثر 100 کاراکتر" })
    @IsString({ message: "نام بازاریاب را وارد کنید" })
    @IsNotEmpty({ message: "نام بازاریاب را وارد کنید" })
    readonly name: string;

    @Length(1, 100, { message: "نام خانوادگی حداکثر 100 کاراکتر" })
    @IsString({ message: "نام بازاریاب را وارد کنید" })
    @IsNotEmpty({ message: "نام بازاریاب را وارد کنید" })
    readonly family: string;

    @IsEmail({ message: "ایمیل بازاریاب نامعتبر" })
    @IsString({ message: "ایمیل بازاریاب را وارد کنید" })
    @IsNotEmpty({ message: "ایمیل بازاریاب را وارد کنید" })
    readonly email: string;

    @IsIn(["active", "deactive"], { message: "وضعیت نامعتبر" })
    @IsString({ message: "یک وضعیت انتخاب کنید" })
    @IsNotEmpty({ message: "یک وضعیت انتخاب کنید" })
    readonly status: string;

    @IsPhoneNumber("IR", { message: "شماره موبایل معتبر نیست" })
    @IsNotEmpty({ message: "شماره موبایل را وارد کنید" })
    readonly mobile: string;

    @IsOptional()
    readonly tel?: string;

    @IsOptional()
    readonly address?: string;

    @IsOptional()
    readonly postalCode?: string;

    @IsOptional()
    readonly nationalCode?: string;

    @Length(8, 100, { message: "رمزعبور حداقل باید 8 کاراکتر باشد" })
    @IsString({ message: "رمزعبور را وارد کنید" })
    @IsNotEmpty({ message: "رمزعبور را وارد کنید" })
    readonly password: string;

    @IsString({ message: "تکرار رمزعبور را وارد کنید" })
    @IsNotEmpty({ message: "تکرار رمزعبور را وارد کنید" })
    readonly passwordConfirmation: string;
}

export class UpdateTeacherDto {
    @IsOptional()
    readonly image?: string;

    @Length(1, 100, { message: "نام حداکثر 100 کاراکتر" })
    @IsString({ message: "نام بازاریاب را وارد کنید" })
    @IsNotEmpty({ message: "نام بازاریاب را وارد کنید" })
    readonly name: string;

    @Length(1, 100, { message: "نام خانوادگی حداکثر 100 کاراکتر" })
    @IsString({ message: "نام بازاریاب را وارد کنید" })
    @IsNotEmpty({ message: "نام بازاریاب را وارد کنید" })
    readonly family: string;

    @IsEmail({ message: "ایمیل بازاریاب نامعتبر" })
    @IsString({ message: "ایمیل بازاریاب را وارد کنید" })
    @IsNotEmpty({ message: "ایمیل بازاریاب را وارد کنید" })
    readonly email: string;

    @IsPhoneNumber("IR", { message: "شماره موبایل معتبر نیست" })
    @IsNotEmpty({ message: "شماره موبایل را وارد کنید" })
    readonly mobile: string;

    @IsOptional()
    readonly tel?: string;

    @IsOptional()
    readonly address?: string;

    @IsOptional()
    readonly postalCode?: string;

    @IsOptional()
    readonly nationalCode?: string;

    @IsNumberString({ message: "بازه زمانی برای کاربران جدید را وارد کنید" })
    @IsNotEmpty({ message: "بازه زمانی برای کاربران جدید را وارد کنید" })
    readonly period: string;

    @IsString({ message: "کد بازاریاب را وارد کنید" })
    @IsNotEmpty({ message: "کد بازاریاب را وارد کنید" })
    readonly marketingCode: string;

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

export class PayTeacherCommissionDto {
    @IsNumberString({ message: "مبلغ پرداختی را وارد کنید" })
    @IsNotEmpty({ message: "مبلغ پرداختی را وارد کنید" })
    readonly amount: string;

    @IsOptional()
    readonly cardNumber?: string;

    @IsOptional()
    readonly bank?: string;
}
