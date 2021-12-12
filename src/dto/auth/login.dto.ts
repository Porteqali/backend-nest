import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class LoginDto {
    @IsNotEmpty({ message: "ایمیل یا شماره همراه خود را وارد کنید" })
    readonly username: string;

    @MinLength(8, { message: "رمزعبور حداقل 8 کاراکتر است" })
    @IsString({ message: "رمزعبور خود را وارد کنید" })
    @IsNotEmpty({ message: "رمزعبور خود را وارد کنید" })
    readonly password: string;
}
