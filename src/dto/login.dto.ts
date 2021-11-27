import { IsEmail, IsNotEmpty, IsString, Length } from "class-validator";

export class LoginDto {
    @IsNotEmpty({ message: "Username is requeired" })
    @IsEmail({}, { message: "Username must be an email address" })
    readonly username: string;

    @IsNotEmpty({ message: "Password is requeired" })
    @Length(8, 15, { message: "Password must be between 8 to 15 characters" })
    @IsString({ message: "Password must be string" })
    readonly password: string;
}
