import {
    DirectSecp256k1HdWallet,
    DirectSecp256k1Wallet,
    Registry,
    EncodeObject,
    Coin,
    GeneratedType,
    encodePubkey,
    makeAuthInfoBytes,
    makeSignBytes,
    makeSignDoc,
    TxBodyEncodeObject
} from '@cosmjs/proto-signing';
import {
    SigningStargateClient,
    StdFee,
    StargateClient,
    IndexedTx,
    defaultRegistryTypes,
    SigningStargateClientOptions
} from '@cosmjs/stargate';
import { fromBase64, toBase64, toBech32 } from "@cosmjs/encoding";
import { sha256, ripemd160, ExtendedSecp256k1Signature, Secp256k1, Secp256k1Signature } from "@cosmjs/crypto";
import { SignDoc, TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { CosmosSdkTransactionResponse, MessageTypeResponse, Pagination } from "./types";
import CosmosUtils, { LocalStargate, prettyNumber } from './utils';
import axios from 'axios';
import { Decimal, Int53 } from '@cosmjs/math';
import { Buffer } from 'buffer';
import { Coinbase } from '../../coinbase';
import { Transaction, MarketAsset, BalanceResponse, Json } from './omnistar/types';
import Blockchain from '../iblockchain';
import { encodeSecp256k1Pubkey, pubkeyToAddress } from '@cosmjs/amino';
import { Any } from 'cosmjs-types/google/protobuf/any';
// import { recoverSigningAddress, verifySignature } from 'cosmos-wallet';

export { SignDoc }

export type TxResponse = {
    txBodyBytes: Uint8Array, 
    authInfoBytes: Uint8Array, 
    chainId: string, 
    accountNumber: number,
    sequence: number, 
    stdFee: StdFee,
    gasLimit: number,
    signDoc: SignDoc
}

export default class Cosmos extends Blockchain {
    smallCoin: number;

    protected _mempoolLink: string = "";
    
    public get mempoolLink() : string {
        return this._mempoolLink;
    }
    // TODO add explorer link
    public get explorerLink() : string {
        return ``;
    }

    NETWORK: string;
    address: string;

    protected publicKey?: string;
    protected bufferPubkey?: Uint8Array;

    // protected static signingClient?: SigningStargateClient;
    // protected static wallet?: DirectSecp256k1Wallet | DirectSecp256k1HdWallet;
    
    // protected static client?: StargateClient;
    // protected static connected?: boolean = false;

    protected signingClient: SigningStargateClient | undefined;
    protected wallet: DirectSecp256k1Wallet | DirectSecp256k1HdWallet | undefined;
    
    client: StargateClient | undefined;
    connected: boolean;

    // TODO add domain name
    static nodeDomain = process.env.FULL_NODE_URL ?? 'http://34.171.146.40';//`http://testnetnode.omnistar.io`;

    static apiPorts = {
        tendermintNode: 26657,
        blockchainAPI: 1317,
        tokenFaucet: 4500
    };

    static prefix: string = "cosmos";

    static denom: string = 'atom';
    static smalldenom: string = 'uatom';
    
    denom: string;
    endpoint: string;
    
    prefix: string;
    registry?: Registry;
    gasPrice: number = Cosmos.basicGasPrice;
    static basicGasPrice: number = 1;
    // for test; 
    logData: any[] = []

    static smallCoin: number = 1_000_000;
    
    constructor(address: string, isMain: boolean, { denom, types, prefix, endpoint, smallCoin }: { denom: string; types?: ReadonlyArray<[string, GeneratedType]>, prefix: string, endpoint: string, smallCoin: number }){
        super(address, isMain);
        
        this.connected = false;
        
        this.denom = denom ?? Cosmos.denom;
        this.prefix = prefix ?? Cosmos.prefix;
        this.registry = new Registry([...defaultRegistryTypes, ...(types || [])]);
        this.endpoint = endpoint ?? `${Cosmos.nodeDomain}:${Cosmos.apiPorts.tendermintNode}`;
        this.smallCoin = smallCoin ?? Cosmos.smallCoin;
        
        this.publicKey = undefined;
        this.bufferPubkey = undefined;        
        
        this.address = address;        
        this.NETWORK = isMain ? `${this.prefix}` : /*maybe need to append a 'testnet' prefix*/ `${this.prefix}`;
    }

    getPrice = async (denom: string): Promise<string> => await Coinbase.symbolExchangeRates(denom ?? this.denom, 'USD');

    protected async formatTransactions(txs: readonly IndexedTx[], price: number, symbol?: string): Promise<Transaction[]>{
        try{
            const parsed: Transaction[] = [];
            let value: IndexedTx;
            for(value of txs){
                const { events, hash, height } = value;
                const transferAttr = events.find(e=>e.type === 'transfer');
                
                if(!transferAttr) {
                    console.warn('Not a transfer tx');
                    continue;
                }

                const [ recipientObj, senderObj, amountObj ] = transferAttr.attributes;
                const [ sym ] = amountObj.value.match(/[a-zA-Z]+/g)!;
                
                // if(sym!==this.denom || sym!==Cosmos.smallCoin) 
                //     return console.warn(`${sym} is not the corrent symbol`);

                const [ stringAmount ] = amountObj.value.match(/\d+/g)!;
                const amount: number = Number(stringAmount);
                
                parsed.push({
                    amount: amount,
                    destinations: [recipientObj.value],
                    pairValue: prettyNumber((amount * price).toString(), 2),
                    recentBlockHash: '',
                    signature: hash,
                    source: senderObj.value,
                    status: 1,
                    symbol: symbol ?? sym,
                    time: new Date(await this.getBlockTime(height)).getTime(),
                    unit: '',
                    more: { info: '', type: '' }
                });
            }

            return parsed;
        }
        catch(e: any){
            console.error(e);
            return [];
        }
    }

    async getTransactionsByAddress(pageSize: number, offset: number): Promise<Transaction[]> {
        throw new Error("Not implemtned");
        /*
        try{
            const price = Number(await this.getPrice());
            return this.formatTransactions(await this.searchIndexedTx(this.address), price);
        }
        catch(e: any){
            console.error(e);
            return [];
        }
        */
    }

    // TODO 
    protected formatBalance(coin: Coin, asset: MarketAsset, targetAsset: string): BalanceResponse{
        const { name, priceChangePercent, priceValue } = asset;
        const { amount, denom } = coin;
        const { address, explorerLink, mempoolLink, smallCoin } = this;
        const value = Number(amount) / smallCoin;
        const pairValue = prettyNumber((value * Number(asset?.priceValue || 0)).toString(), 2);
        return {
            res: { errorCode: '-1', message: '', statusCode: 200 },
            data: {
                address,
                explorerLink,
                mempoolLink,
                name,
                pairValue,
                priceChangePercent,
                priceValue,
                smallCoin: smallCoin.toString(),
                symbol: denom,
                targetAsset: targetAsset || '',
                value: value.toString(10)
            }
        }
    }

    async getBalance(asset: MarketAsset, targetAsset: string): Promise<BalanceResponse> {
        try{
            const client = this.client ?? await this.connect();
            if(client)
                return this.formatBalance(await client.getBalance(this.address, this.denom), asset, targetAsset);
            return this.formatBalance({amount: '0', denom: this.denom }, asset, targetAsset);
        }
        catch(e: any){
            console.error(e);
            return this.formatBalance({amount: '0', denom: this.denom }, asset, targetAsset);
        }
    }

    protected formatPublics(pubkey: Buffer){
        this.bufferPubkey = pubkey;
        this.publicKey = pubkey.toString("hex");
        this.address = Cosmos.generateAddressFromPublic(pubkey, this.prefix);

        this.logData = this.logData.concat([
            { "this.prefix": this.prefix },
            { "Cosmos.pubkey": this.bufferPubkey },
            { "Cosmos.publicKey": this.publicKey },
            { "this.address": this.address }
        ]);
    }
    
    static generateAddressFromPublic(pubkey: Buffer, prefix: string): string {
        return toBech32(prefix, ripemd160(sha256(Uint8Array.from(pubkey))));
    }

    protected static async walletFromMnemonic(mnemonic: string, prefix: string): Promise<DirectSecp256k1HdWallet>{
        return await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix });
    }

    protected static async walletFromPrivate(priv: string, prefix: string): Promise<DirectSecp256k1Wallet>{
        return await DirectSecp256k1Wallet.fromKey(Uint8Array.from(Buffer.from(priv,"hex")), prefix);
    }

    protected async connectWallet({ mnemonic, priv }:{ mnemonic?: string, priv?: string }): Promise<DirectSecp256k1HdWallet | DirectSecp256k1Wallet>{
        if(mnemonic) this.wallet = await Cosmos.walletFromMnemonic(mnemonic, this.prefix);
        else if(priv) this.wallet = await Cosmos.walletFromPrivate(priv, this.prefix);
        else throw new Error("no mnemonic or privateKey for init this wallet");
        this.logData.push({"wallet.getAccounts()": await this.wallet.getAccounts() });
        
        const [ account ] = await this.wallet.getAccounts();
        const { pubkey } = account;
        this.formatPublics(Buffer.from(pubkey));
        return this.wallet;
    }

    protected async getGasPrice(): Promise<number>{
        // TODO implement end point for gas price
        return Cosmos.basicGasPrice;
    }

    protected feeToGasPriceFormat(){
        return {
            denom: this.denom,
            amount: Decimal.fromUserInput(this.gasPrice.toString(10), 5)
        }
    }

    async connectLocalStargate(address: string){
        return await LocalStargate.localConnect({
            address,
            bufferPubkey: Uint8Array.from([]),
            denom: this.denom,
            gasPrice: this.gasPrice,
            registry: this.registry
        }, this.endpoint);
    }
    
    async getPubKey(address: string){
        try{
            const stargate = await this.connectLocalStargate(address);
            if(stargate && stargate.localClient && stargate.localClient.bufferPubkey)
                return stargate.localClient.bufferPubkey;
            console.log('stargate.localClient.bufferPubkey not found');
        }
        catch(e){
            console.error(e);
        }
        return new Uint8Array([]);
    }

    async connectSigStargateClient({ mnemonic, priv, wallet, gasPrice }:{ mnemonic?: string, priv?: string, wallet?: DirectSecp256k1HdWallet | DirectSecp256k1Wallet, gasPrice?: number }): Promise<SigningStargateClient>{
        if(!gasPrice || gasPrice === null)
            this.gasPrice = await this.getGasPrice();
        
        this.wallet = (wallet) ? wallet : await this.connectWallet({ priv, mnemonic });
        const options: SigningStargateClientOptions = { prefix: this.prefix, registry: this.registry, gasPrice: this.feeToGasPriceFormat() };
        this.signingClient = await SigningStargateClient.connectWithSigner(this.endpoint, this.wallet, options);
        return this.signingClient;
    }

    async estimateFee({ messages, memo }: { messages: readonly EncodeObject[], memo: string }): Promise<number>{
        const { address, bufferPubkey, denom, registry, endpoint, gasPrice } = this;
        if(!bufferPubkey) throw new Error("missing bufferPubkey");
        const localStargate: LocalStargate = await LocalStargate.localConnect({ address, bufferPubkey, denom, registry, gasPrice }, endpoint);
        return localStargate.estimateFee({ memo, messages });
    }

    async genStdFeeObj(fee: number, { messages, memo, gasBytes = 20_000 }: { messages: readonly EncodeObject[]; memo?: string; gasBytes?: number; }): Promise<StdFee>{
        const { address, bufferPubkey, denom, registry, endpoint, gasPrice } = this;
        if(!bufferPubkey) throw new Error("missing bufferPubkey");
        const localStargate: LocalStargate = await LocalStargate.localConnect({ address, bufferPubkey, denom, registry, gasPrice }, endpoint);
        return await localStargate.genStdFeeObj(fee, { memo, messages });
    }

    async createMsgSend({pubkey, fromAddress, toAddress, amount, fee }: {
        pubkey?: Uint8Array
        fromAddress: string, 
        toAddress: string, 
        amount: any, 
        fee: number
    }): Promise<TxResponse>{
        const sendMsg = {
            typeUrl: "/cosmos.bank.v1beta1.MsgSend",
            value: {
                fromAddress,
                toAddress,
                amount: [...amount],
            },
        };
        return await this.createTransaction(fromAddress, pubkey!, fee, [sendMsg]);
    }
    
    // tx task 1.
    async createTransaction(
        from: string,
        pubkey: Uint8Array,
        fee: number,
        messages: readonly EncodeObject[],
        memo?: string
    ): Promise<TxResponse> {
        await this.connect();
        if(pubkey) this.formatPublics(Buffer.from(pubkey));
        const txBodyEncodeObject: TxBodyEncodeObject = {
            typeUrl: "/cosmos.tx.v1beta1.TxBody",
            value: {
                messages: messages ? messages : [],
                //! TODO check if need to implement memo param in this method
                memo,
            },
        };
        const { accountNumber, sequence } = await this.client!.getSequence(from ?? this.address);
        const chainId = await this.client!.getChainId();
        const pk: Any = encodePubkey(encodeSecp256k1Pubkey(pubkey ?? this.bufferPubkey ?? new Buffer(0)));
        const txBodyBytes = this.registry!.encode(txBodyEncodeObject);
        fee = fee ?? await this.getGasPrice();
        const stdFee: StdFee = await this.genStdFeeObj(fee, { memo, messages });
        const gasLimit = Int53.fromString(stdFee.gas).toNumber();
        const authInfoBytes = makeAuthInfoBytes(
            [{ pubkey: pk, sequence }],
            stdFee.amount,
            gasLimit,
            stdFee.granter,
            stdFee.payer,
        );
        const signDoc: SignDoc = makeSignDoc(txBodyBytes, authInfoBytes, chainId, accountNumber);
        return { txBodyBytes, authInfoBytes, chainId, accountNumber, sequence, stdFee, gasLimit, signDoc };    
    }
    // tx task 2.
    compileTransaction(tx: SignDoc) {
        const signBytes = makeSignBytes(tx);
        const hashedMessage = sha256(signBytes);
        return Buffer.from(hashedMessage);
    }
    // tx task 4.
    formatSignature({ bodyBytes, authInfoBytes }: SignDoc, signatures: Uint8Array[]): Uint8Array {
        const txRaw: TxRaw = TxRaw.fromPartial({ bodyBytes, authInfoBytes, signatures });
        const txBytes = TxRaw.encode(txRaw).finish();
        return txBytes;
    }

    protected async signAndBroadcast({ 
        transaction, 
        messages, 
        client,
    }:{
        transaction: any,
        messages: readonly EncodeObject[],
        client: SigningStargateClient,
        stdFee?: StdFee
    }): Promise<{ failed: boolean, txId?: string, error?: any, txData?: any }> {
        const stdFee: StdFee = await this.genStdFeeObj(11, { memo: "", messages });
        try {
            const { 
                code,
                events,
                gasUsed,
                gasWanted,
                height,
                transactionHash,
                data,
                rawLog 
            } = await client.signAndBroadcast(this.address, messages, stdFee);
            console.log({ code, events, gasUsed, gasWanted, height, transactionHash, data, rawLog });
            return { failed: false, txData: data, txId: transactionHash };
        }
        catch (e: any) {
            console.error(e);
            return { failed: false, error: e };
        }
    }
    // TODO need to test that
    protected queryEventsToString(moduleUrl: string, event?: string): string {
        if (!event) return '';
        if (!event.includes('Msg')) event = `Msg${CosmosUtils.upperFirstLetter(event)}`;
        return `events=message.action=%27/${moduleUrl.replace(/\//g, '.')}.${event}%27`;
    }
    // TODO need to test that
    // GetTxsEvent fetches txs by event
    public async getTransactions(baseUrl: string, pagination?: Pagination, event?: string) {
        let url: string = '';
        try {
            const paginationQueryString = CosmosUtils.queryJsonToString(pagination);

            const queryEvents: string = this.queryEventsToString(baseUrl, event);

            const query: string = `${paginationQueryString !== '' || queryEvents !== '' ? '?' : ''}${queryEvents}${paginationQueryString}`;

            url = `${baseUrl}/tx/v1beta1/txs${query}`;

            const { data, status } = await axios.get(url);

            if (status !== 200) {
                console.error(data);
                return { error: data };
            }
            return data;
        }
        catch (e: any) {
            const interanlServerError = `Failed to get transaction by event - '${event}' from url - '${url}'`;
            console.error(interanlServerError);
            console.error(e);
            return { error: { code: 500, details: [], message: `Internal server Error: ${interanlServerError}` } };
        }
    }

    async getObjectFromBlockchain(sig: string): Promise<string | undefined> {
        const r: IndexedTx | null = await this.getIndexedTx(sig)
        return (r!=null) ? r.hash : undefined;
    }

    protected buildQueryString(query?: Json, pagination?: Pagination): string {
        const paginationQueryString = CosmosUtils.queryJsonToString(pagination);
        const queryString = CosmosUtils.queryJsonToString(query);
        const seperate =
            paginationQueryString !== '' &&
                queryString !== ''
                ? '&'
                : '';
        const queryOperator =
            paginationQueryString !== '' ||
                queryString !== ''
                ? '?'
                : ''

        return `${queryOperator}${paginationQueryString}${seperate}${queryString}`;
    }

    public async getMessageTypeTxs(baseUrl: string, messageType: string, messageQuery?: Json, pagination?: Pagination): Promise<MessageTypeResponse> {
        // keep url out for catching errors and show from which url is fired
        let url: string = '';
        try {
            const query: string = this.buildQueryString(messageQuery, pagination);

            url = `${baseUrl}${messageType}${query}`;

            const { data, status } = await axios.get(url);

            if (status !== 200) {
                console.error(data);
                return { error: data };
            }
            return data;
        }
        catch (e: any) {
            const interanlServerError = `Failed to get message type - '${messageType}' from url - '${url}'`;
            console.error(interanlServerError);
            console.error(e);
            return { error: { code: 500, details: [], message: `Internal server Error: ${interanlServerError}` } };
        }
    }

    protected async setClient(): Promise<StargateClient> {        
        this.client = await StargateClient.connect(this.endpoint);
        this.connected = true;
        return this.client;
    }

    protected async connect(): Promise<StargateClient> {
        if(!this.connected) return await this.setClient();
        return this.client!;
    }

    protected async getBlockTime(height?: number | undefined): Promise<string>{
        const res = await (await this.connect()).getBlock(height);
        return res?.header.time || new Date().toLocaleString();
    }

    async getTx(hash: string): Promise<CosmosSdkTransactionResponse> {
        let url: string = '';
        try {
            url = `${this.endpoint}/cosmos/tx/v1beta1/txs/${hash}`;

            const { data, status } = await axios.get(url);

            if (status !== 200) {
                console.error(data);
                return { error: data };
            }
            return data;
        }
        catch (e: any) {
            const interanlServerError = `Failed to get tx - hash: '${hash}' from url - '${url}'`;
            console.error(interanlServerError);
            console.error(e);
            return { error: { code: 500, details: [], message: `Internal server Error: ${interanlServerError}` } };
        }
    }

    async getIndexedTx(hash: string): Promise<IndexedTx | null> {
        const connection = await this.connect();
        if(!connection) {
            console.error('No conection!')
            return null;
        }
        return connection.getTx(hash);
    }

    async searchIndexedTx(address: string): Promise<readonly IndexedTx[]> {
        const connection = await this.connect();
        if(!connection) {
            console.error('No conection!')
            return [];
        }
        return await connection.searchTx({ sentFromOrTo: address });
    }

    async recoverSigningAddress(signature: string, hash: Uint8Array, recoveryIndex: number) {
        const prefix = this.prefix;
        return __awaiter(this, void 0, void 0, function* () {
            if (recoveryIndex > 3) {
                throw new Error('Invalid recovery index');
            }
            const sig = Secp256k1Signature.fromFixedLength(fromBase64(signature));
            const extendedSig = new ExtendedSecp256k1Signature(sig.r(), sig.s(), recoveryIndex);
            try {
                const recoveredPubKey: Uint8Array = yield Secp256k1.recoverPubkey(extendedSig, hash);
                return pubkeyToAddress({
                    type: 'tendermint/PubKeySecp256k1',
                    value: toBase64(Secp256k1.compressPubkey(recoveredPubKey)),
                }, prefix);
            }
            catch (_a) {
                return null;
            }
        });
    }
    async verifySignature(address: string, signature: string, hash: Uint8Array) {
        const classnstance = this;
        return __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < 4; i++) {
                const recoveredAddress: string = yield classnstance.recoverSigningAddress(signature, hash, i);
                if (recoveredAddress === address) {
                    return true;
                }
            }
            return false;
        });
    }
    async verifyDirectSignature(address: string, signature: string, signDoc: SignDoc){
        const messageHash = sha256(makeSignBytes(signDoc));
        return this.verifySignature(address, signature, messageHash);
    };
}

var __awaiter = function (thisArg: any, _arguments: any, P: any, generator: any) {
    function adopt(value: any) { return value instanceof P ? value : new P(function (resolve: any) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve: any, reject: any) {
        function fulfilled(value: any) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value: any) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result: any) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};