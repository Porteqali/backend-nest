import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { UnprocessableEntityException, ValidationPipe } from "@nestjs/common";
import * as cookieParser from "cookie-parser";
import * as helmet from "helmet";
import * as csurf from "csurf";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

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

    await app.listen(process.env.PORT);
}
bootstrap();
