import { IsEmail, IsNotEmpty, Length, IsString, IsArray, IsIn, IsOptional } from "class-validator";

export class CreateNewAdminDto {
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

    @IsString({ message: "یک گروه دسترسی انتخاب کنید" })
    @IsNotEmpty({ message: "یک گروه دسترسی انتخاب کنید" })
    readonly permissionGroup: string;

    @IsIn(["active", "deactive"], { message: "وضعیت نامعتبر" })
    @IsString({ message: "یک وضعیت انتخاب کنید" })
    @IsNotEmpty({ message: "یک وضعیت انتخاب کنید" })
    readonly status: string;

    @Length(8, 100, { message: "رمزعبور حداقل باید 8 کاراکتر باشد" })
    @IsString({ message: "رمزعبور را وارد کنید" })
    @IsNotEmpty({ message: "رمزعبور را وارد کنید" })
    readonly password: string;

    @IsString({ message: "تکرار رمزعبور را وارد کنید" })
    @IsNotEmpty({ message: "تکرار رمزعبور را وارد کنید" })
    readonly passwordConfirmation: string;
}

export class UpdateNewAdminDto {
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

    @IsString({ message: "یک گروه دسترسی انتخاب کنید" })
    @IsNotEmpty({ message: "یک گروه دسترسی انتخاب کنید" })
    readonly permissionGroup: string;

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
