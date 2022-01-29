import { IsEmail, IsNotEmpty, Length, IsString, IsArray, IsIn, IsOptional, IsNumberString, IsPhoneNumber, IsDateString } from "class-validator";

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

    @IsOptional()
    @IsString({ message: "فرمت تاریخ تولد اشتباه است" })
    readonly birthDate?: string;

    @IsOptional()
    readonly fatherName?: string;

    @IsString({ message: "توضیحی در مورد استاد وارد کنید" })
    @IsNotEmpty({ message: "توضیحی در مورد استاد وارد کنید" })
    readonly description: string;

    @IsString({ message: "حداقل یک گروه برای استاد انتخاب کنید" })
    @IsNotEmpty({ message: "حداقل یک گروه برای استاد انتخاب کنید" })
    readonly groups: string;

    @IsOptional()
    readonly cardNumber?: string;

    @IsOptional()
    readonly cardOwnerName?: string;

    @IsOptional()
    readonly cardBankName?: string;

    @IsOptional()
    readonly shebaNumber?: string;

    @IsString({ message: "کمیسیون استاد را مشخص کنید" })
    @IsNotEmpty({ message: "کمیسیون استاد را مشخص کنید" })
    readonly commission: string;
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

    @IsOptional()
    @IsString({ message: "فرمت تاریخ تولد اشتباه است" })
    readonly birthDate?: string;

    @IsOptional()
    readonly fatherName?: string;

    @IsString({ message: "توضیحی در مورد استاد وارد کنید" })
    @IsNotEmpty({ message: "توضیحی در مورد استاد وارد کنید" })
    readonly description: string;

    @IsString({ message: "حداقل یک گروه برای استاد انتخاب کنید" })
    @IsNotEmpty({ message: "حداقل یک گروه برای استاد انتخاب کنید" })
    readonly groups: string;

    @IsOptional()
    readonly cardNumber?: string;

    @IsOptional()
    readonly cardOwnerName?: string;

    @IsOptional()
    readonly cardBankName?: string;

    @IsOptional()
    readonly shebaNumber?: string;

    @IsString({ message: "کمیسیون استاد را مشخص کنید" })
    @IsNotEmpty({ message: "کمیسیون استاد را مشخص کنید" })
    readonly commission: string;
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
