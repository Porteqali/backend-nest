import { Request } from "express";

export interface GatewayInterface {
    getIdentifier(apiKey: string, amount: number, redirect: string, description: string, mobile?): Promise<string>;
    getGatewayUrl(identifier: string): string;
    getTransactionResponse(req: Request): TransactionResponse;
    verify(apiKey: string, identifier: string, extra?): Promise<VerficationResponseInterface>;
}

export interface VerficationResponseInterface {
    transactionCode: string;
    status: number;
    other?: object;
}

export interface TransactionResponse {
    status: string;
    identifier: string;
}
