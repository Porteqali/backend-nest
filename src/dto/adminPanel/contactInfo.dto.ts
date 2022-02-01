import { IsNotEmpty, IsString, IsOptional } from "class-validator";

export class UpdateContactInfoDto {
    @IsString({ message: "شماره تلفن را وارد کنید" })
    @IsNotEmpty({ message: "شماره تلفن را وارد کنید" })
    readonly tel: string;

    @IsString({ message: "ایمیل را وارد کنید" })
    @IsNotEmpty({ message: "ایمیل را وارد کنید" })
    readonly email: string;

    @IsString({ message: "کدپستی را وارد کنید" })
    @IsNotEmpty({ message: "کدپستی را وارد کنید" })
    readonly post_code: string;

    @IsString({ message: "آدرس را وارد کنید" })
    @IsNotEmpty({ message: "آدرس را وارد کنید" })
    readonly address: string;

    @IsOptional()
    readonly socials?: object;
}
