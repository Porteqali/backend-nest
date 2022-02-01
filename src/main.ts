import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { UnprocessableEntityException, ValidationPipe } from "@nestjs/common";
import * as cookieParser from "cookie-parser";
import * as helmet from "helmet";
import * as csurf from "csurf";
import * as bcrypt from "bcrypt";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // let hash = "$2y$10$yw03I3FlAuw/THtxAw4m5.T1ZNhqBILOIGNRg6o8xaM8HwaweMLk6"; // orginal laravel hashed password
    // let hash = "$2a$10$yw03I3FlAuw/THtxAw4m5.T1ZNhqBILOIGNRg6o8xaM8HwaweMLk6"; // modified laravel hashed password (first 'y' turned into 'a')
    // hash = hash.replace(/^\$2y(.+)$/i, '$2a$1'); // modification regex
    // console.log(bcrypt.compareSync("12345678", hash));

    // TODO
    // check if static files exist or not... if not create them
    const staticFileList = ["about_us.json", "banner.json", "contact_info.json", "latest_news.json"];
    // also generate storage folder structure

    // added validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            errorHttpStatusCode: 422,
            stopAtFirstError: true,
            exceptionFactory: (errors) => {
                return new UnprocessableEntityException(
                    errors.map((item) => {
                        return {
                            property: item.property,
                            errors: Object.values(item.constraints),
                        };
                    }),
                );
            },
        }),
    );

    // added cookie parser
    app.use(cookieParser());

    // setup helmet for http headers
    app.use(helmet());

    // added csrf protection
    // app.use(csurf({ cookie: true}));

    // make CORS happen
    app.enableCors({ origin: `http://localhost:3000` });

    // set the timezone
    process.env.TZ = "Asia/Tehran";

    await app.listen(process.env.PORT);
}
bootstrap();
