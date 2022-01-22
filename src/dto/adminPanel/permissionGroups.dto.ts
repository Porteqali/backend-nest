import { IsEmail, IsNotEmpty, Length, IsString, IsArray } from "class-validator";

export class CreatePermissionGroupDto {
    @Length(1, 100, { message: "نام حداکثر 100 کاراکتر" })
    @IsString({ message: "نام گروه دسترسی را وارد کنید" })
    @IsNotEmpty({ message: "نام گروه دسترسی را وارد کنید" })
    readonly name: string;

    @IsArray({ message: "لیست مجوز ها معتبر نیست" })
    @IsNotEmpty({ message: "حداقل یک مجوز انتخاب کنید" })
    readonly selectedPermissions: string[];
}
