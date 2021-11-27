import { IsEmail, IsNotEmpty, Length, IsString } from "class-validator";

export class RegisterDto {
    @IsNotEmpty({ message: "Name is requeired" })
    @IsString({ message: "Name must be string" })
    @Length(1, 100, { message: "Name must be max 100 characters" })
    readonly name: string;

    @IsNotEmpty({ message: "Family is requeired" })
    @IsString({ message: "Family must be string" })
    @Length(1, 100, { message: "Family must be max 100 characters" })
    readonly family: string;

    @IsNotEmpty({ message: "Email is requeired" })
    @IsEmail({}, { message: "Email must be an valid" })
    readonly email: string;

    @IsNotEmpty({ message: "Password is requeired" })
    @Length(8, 15, { message: "Password must be between 8 to 15 characters" })
    @IsString({ message: "Password must be string" })
    readonly password: string;
}
