import { MessageTypeResponse } from "../types";

export interface RawData {
    objectId: string,
    creator: string,
    destination: string,
    data: string,
    createdAt: string,
    blockHeight: string,
    hash: string
}

export interface RawDataResponse extends MessageTypeResponse { rawData?: RawData[] }


export type MarketAsset = {
    name: string,
    priceValue: string, // "42,000.00" from market
    priceChangePercent: string // "+0.22" from market
};

export type Layer2dataTransactionType = 
    'Native' | 
    'ERC20' | 
    'ERC721';

export interface Layer2data {
    contractAddress: string;
    smallCoin: string,
    transactionType: Layer2dataTransactionType
}


export interface Balance extends MarketAsset {
    address: string,
    symbol: string,
    value: string,
    targetAsset: string,
    pairValue: string,
    balance?: string,
    smallCoin: string,
    mempoolLink: string, 
    explorerLink: string,
    layer2data?: Layer2data
}

export type apiResponse = {
    statusCode: number,
    errorCode: string,
    message: string
}

export type BalanceResponse = {
    data?: Balance,
    res: apiResponse
}

export type Json = { [key: string]: any};

export interface Transaction {
    unit: string,
    time: number,
    pairValue: string,
    source: string, 
    destinations: string[],
    amount: number, 
    signature: string, // tx id
    symbol: string, 
    recentBlockHash: string // not for mobile
    status: number,
    // solana types
    more: {
        type: string,
        info: {}
    }
};