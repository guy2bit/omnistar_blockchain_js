export interface FaucetCoin { denom: string, amount: number }

export interface Pagination {
    key: string,
    limit: string,
    offset: string
}

export interface MessageDetail { [key: string]: string }

export interface UnexpectedErrorResponse {
    code: number,
    message: string,
    details: MessageDetail[] // {'@type': "string"}
}

export interface PaginationResponse {
    next_key: string,
    total: string
}

export interface ApiResponse {
    pagination: PaginationResponse,
    [key: string]: any
}

export interface Amount { denom: string, amount: string }

export interface Event {
    type: string,
    attributes: EventAttribute[]
}

export interface EventAttribute {
    key: string,
    value: string,
    index: true
}

export interface Signer_info {
    public_key: MessageDetail[],
    mode_info: {
        single: {
            mode: number //SIGN_MODE_UNSPECIFIED
        },
        multi: {
            bitarray: {
                extra_bits_stored: 0,
                elems: string
            },
            mode_infos: any[]
        }
    },
    sequence: string
}

export interface Log {
    msg_index: 0,
    log: string,
    events: Event[]
}

export interface CosmosSdkTransaction {
    tx: {
        body: {
            messages: MessageDetail[],
            memo: string,
            timeout_height: string,
            extension_options: MessageDetail[],
            non_critical_extension_options: MessageDetail[]
        },
        auth_info: {
            signer_infos: Signer_info[],
            fee: {
                amount: Amount[],
                gas_limit: string,
                payer: string,
                granter: string
            },
            tip: {
                amount: Amount[],
                tipper: string
            }
        },
        signatures: string[]
    },
    tx_response: {
        height: string,
        txhash: string,
        codespace: string,
        code: 0,
        data: string,
        raw_log: string,
        logs: Log[],
        info: string,
        gas_wanted: string,
        gas_used: string,
        tx: MessageDetail,
        timestamp: string,
        events: Event[]
    }
}

export interface CosmosSdkTransactionResponse { data?: CosmosSdkTransaction, error?: UnexpectedErrorResponse }

export interface MessageTypeResponse {
    pagination?: Pagination,
    data?: any[],
    error?: UnexpectedErrorResponse
}

export namespace Market { 
    
    export type Ticker24hr = {
        symbol: string,
        name: string,
        priceChange: string,
        priceChangePercent: string,
        weightedAvgPrice: string,
        lastPrice: string,
        lastQty: string,
        openPrice: string,
        highPrice: string,
        lowPrice: string,
        volume: string,
        quoteVolume: string,
        openTime: number,
        closeTime: number,
        firstId: number,
        lastId: number,
        count: number
    };
    
    export type TickerPrice = { symbol: string, price: string, time: number };
    
    export type AvgPrice = { mins: number /* 5 */, price: string /* "9.35751834" */ };

    export interface rates {
        [key: string]: string;
    }
    
    export interface ExchangeRates {
        currency: string,
        rates: rates
    }
};

// qty is in small coin of given token
export type Total = { qty: number, usd: number };

export interface EstimatedFee { 
    low: Total, 
    medium: Total, 
    high: Total 
}

export namespace bitcoiner{
    export type Total = { satoshi: number, usd: number };

    export type signatureType = 'p2pkh' | 'p2sh-p2wpkh' | 'p2wpkh';

    export type TotalSigTypes  = {
        [key in signatureType]: Total;
    };

    export type Estimate = {
        sat_per_vbyte: number,
        total: TotalSigTypes
    };

    export type blockTime = '30' | '60' | '120' | '180' | '360' | '720' | '1440'
    
    export type EstimateTypes = {
        [key in blockTime]: Estimate;
    };

    export interface EstimateFeePrices {
        estimates: EstimateTypes,
        timestamp: number
    }
}

export type MarketAsset = {
    name: string,
    priceValue: string, // "42,000.00" from market
    priceChangePercent: string // "+0.22" from market
};
