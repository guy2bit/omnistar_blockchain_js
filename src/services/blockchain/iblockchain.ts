import { MarketAsset, EstimatedFee } from "./cosmos/types";

export default abstract class Blockchain {
    protected _mempoolLink: string = "";
    protected _explorerLink: string = "";
    
    static info: any;
    static smallCoin: number;
    abstract smallCoin: number;

	url: string;
    isMain: boolean;
	address: string;
    balance: any;
     
	static utxo: any;
	static lastTransaction: any;
	
    constructor(address: string, isMain: boolean) {
        this.address = address;
        this.isMain = isMain;
        this.url = '/';
    }

    //! Method not implemented.
    // abstract getCurrentBlockNumber(): Promise<number>;
    
    abstract getTransactionsByAddress(pageSize: number, offset: number, before: string, until: string): Promise<any>;

    abstract getBalance(asset: MarketAsset, targetAsset: string): Promise<any>;

    static getEstimatedFee(): Promise<EstimatedFee> {
        throw new Error('Not implemented.');
    }
}
