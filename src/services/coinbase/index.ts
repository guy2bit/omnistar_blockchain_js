import axios from 'axios';
import { Market } from '../blockchain/cosmos/types';

export class Coinbase {
    static URI_V2 = "https://api.coinbase.com/v2/";

    static async symbolExchangeRates(symbol: string, pair: string): Promise<string> {
        try {
            console.log('sampling market (coinbase)');
            return (await Coinbase.exchangeRates(`?currency=${symbol}`)).rates[pair];
        } catch (exception) {
            console.error(exception);
            return '0.00';
        }
    }

    static async exchangeRates(query: string = ''): Promise<Market.ExchangeRates>{
        const URI = Coinbase.URI_V2 + "exchange-rates" + query;
        try {
            const { data, status } = await axios.get(URI);
            if (status !== 200)
                throw new Error(`Failed to fetch exchange-rates from ${URI}`);
            const exchangeRates: Market.ExchangeRates = data.data;
            return exchangeRates;
        } catch (exception) {
            console.error(`ERROR received from ${URI}: ${exception}\n`);
            return {
                "currency": "USD",
                "rates": {}
            };
        }
    }
}