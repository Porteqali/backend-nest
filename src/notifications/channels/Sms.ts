import { get } from "https";

type SmsType = "verify" | "sms";

export default async (type: SmsType, receptor: string, message: string, tokenList: Array<string>, template: string) => {
    let method = "send";
    if (type == "verify") method = "lookup";

    let url = `https://api.kavenegar.com/v1/${process.env.KAVENEGAR_API_KEY}/${type}/${method}.json`;

    let params = [`receptor=${receptor}`];
    if (type == "verify") {
        params.push(`template=${template}`);
        params.push(`token=${tokenList[0]}`);
        if (!!tokenList[1]) params.push(`token2=${tokenList[1]}`);
        if (!!tokenList[2]) params.push(`token3=${tokenList[2]}`);
    } else {
        params.push(`message=${message}`);
    }
    url = `${url}?${params.join("&")}`;

    get(url, (response) => {
        response.on("data", (chunk) => {
            // console.log("BODY: " + chunk);
        });
    });
};
