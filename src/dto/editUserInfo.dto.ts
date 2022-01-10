import { IsEmail, IsNotEmpty, Length, IsString, IsPhoneNumber } from "class-validator";

export class EditUserInfoDto {
    @Length(1, 100, { message: "نام حداکثر 100 کاراکتر" })
    @IsString({ message: "نام خود را وارد کنید" })
    @IsNotEmpty({ message: "نام خود را وارد کنید" })
    readonly name: string;

    @Length(1, 100, { message: "نام خانوادگی حداکثر 100 کاراکتر" })
    @IsString({ message: "نام خانوادگی خود را وارد کنید" })
    @IsNotEmpty({ message: "نام خانوادگی خود را وارد کنید" })
    readonly family: string;
}
