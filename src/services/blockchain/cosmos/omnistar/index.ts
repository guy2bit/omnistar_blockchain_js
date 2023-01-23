import { 
    coins,
    DirectSecp256k1HdWallet,
    DirectSecp256k1Wallet,
    EncodeObject,
    GeneratedType 
} from '@cosmjs/proto-signing';
import { 
    IndexedTx,
    SigningStargateClient,
    StdFee 
} from '@cosmjs/stargate';
import { MsgGrantAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/tx";
import { BasicAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/feegrant";
import { Any } from "cosmjs-types/google/protobuf/any";
import { BalanceResponse, Json, MarketAsset, RawDataResponse, Transaction } from './types';
import { IMsgCreateData, MsgCreateData } from './tx';
import Cosmos, { SignDoc, TxResponse } from '..';
import { Pagination } from "../types";
import axios from 'axios';

export const proxyDomain: string = 'proxy.omnistar.io';

export default class Omnistar extends Cosmos {
    
    static symbol = "ost"

    private static powNost = (pow: number) => Omnistar.nost * Math.pow(10,pow);
    
    static nost = 1;

    static ost = Omnistar.powNost(9);
    
    static nodeDomain = process.env.FULL_NODE_URL ?? 'http://34.171.146.40';//`http://testnetnode.omnistar.io`;
    
    moduleUrl: string = '/omnistar/omnistar/';

    moduleFullUrl: string = `${Omnistar.nodeDomain}:${Omnistar.apiPorts.blockchainAPI}${this.moduleUrl}`;

    sdkUrl: string = `${Omnistar.nodeDomain}:${Omnistar.apiPorts.blockchainAPI}/cosmos/`;
    
    static messagesTypes: ReadonlyArray<[string, GeneratedType]> = [
        ["/omnistar.omnistar.MsgCreateData", MsgCreateData],
        ["/cosmos.feegrant.v1beta1.MsgGrantAllowance", MsgGrantAllowance]
    ];

    static prefix: string = 'omnistar';

    static denom: string = 'nost';
    static smallCoin: number = 1_000_000_000;

    static basicGasPrice: number = 11;

    constructor(address: string, isMain: boolean) {
        super(address, isMain, { 
            types: Omnistar.messagesTypes, 
            prefix: Omnistar.prefix, 
            denom: Omnistar.denom,
            endpoint: `${Omnistar.nodeDomain}:${Omnistar.apiPorts.tendermintNode}`,
            smallCoin: Omnistar.smallCoin
        });
        this.NETWORK = isMain ? `${Omnistar.prefix}` : /*maybe need to append a 'testnet' prefix*/ `${Omnistar.prefix}`;
    }
    
    // getPrice = async (): Promise<string> => "0.0000001";

    protected async getGasPrice(): Promise<number>{
        // TODO implement end point for gas price
        return Omnistar.basicGasPrice;
    }

    async connectSigStargateClient({ mnemonic, priv, wallet }:{ mnemonic?: string, priv?: string, wallet?: DirectSecp256k1HdWallet | DirectSecp256k1Wallet }): Promise<SigningStargateClient>{ 
        this.gasPrice = await this.getGasPrice();
        return await super.connectSigStargateClient({ mnemonic, priv, wallet, gasPrice: this.gasPrice });
    }

    async getTransactionsByAddress(pageSize: number, offset: number): Promise<Transaction[]> {
        try{
            const price = Number(await this.getPrice(Cosmos.denom));
            return await this.formatTransactions(await this.searchIndexedTx(this.address), price, Omnistar.symbol);
        }
        catch(e: any){
            console.error(e);
            return [];
        }
    }

    async getBalance(asset: MarketAsset, targetAsset: string): Promise<BalanceResponse>{
        asset.priceValue = await this.getPrice(Cosmos.denom);
        const balanceResponse: BalanceResponse = await super.getBalance(asset, targetAsset);
        balanceResponse.data!.symbol = Omnistar.symbol;
        return balanceResponse;
    }

    // Queries a list of RawData items.
    public async getRawData(messageQuery?: Json, p?: Pagination): Promise<RawDataResponse> {
        try {
            const { pagination, rawData, error } = (await this.getMessageTypeTxs(this.moduleFullUrl, 'raw_data', messageQuery, p) as RawDataResponse);

            const res = { pagination, data: rawData, error };

            // res.data = res.data.map((raw: RawData) => JSON.parse(raw.data));

            return res;
        }
        catch (e) {
            const interanlServerError = `Failed to get raw data`;
            console.error(interanlServerError);
            console.error(e);
            return { error: { code: 500, details: [], message: `Internal server Error: ${interanlServerError}` } };
        }
    }

    static async getAirdrop(to: string): Promise<boolean> {
        try {
            const { status, data } = await axios.get(`https://${proxyDomain}:8084/api/faucet?address=${to}`, {
                headers: { 'api-key': 'nft.r@bit2safe.wikey.io' }
            });
            if(status !== 200) throw new Error(JSON.stringify(data));
            return true;
        }
        catch (e: any) {
            console.error('Faucet failed');
            console.error(e);
            return false;
        }
    }

    static async sendFeeGrant(to: string, isMain: boolean, mnemonic: string): Promise<boolean> {
        try {
            const omnistar = new Omnistar('', isMain);
            // const mnemonic = "mom soft trim release blood rice rhythm inspire ostrich option unlock tiny fox tomato taxi labor fat glass nerve spoil police dizzy shed isolate"//process.env.FAUCET_MNEMONIC;
            // const mnemonic = "goat pyramid symbol combine paddle napkin decade enroll orphan clay kiwi trumpet clutch make enrich thunder search actor response plate bracket volume renew person"
            // if(!mnemonic) throw new Error('mnemonic is not defined for that proxy!');
            
            await omnistar.connectSigStargateClient({ mnemonic });
            
            console.log('address:', omnistar.address);
            
            const allowance: Any = {
                typeUrl: "/cosmos.feegrant.v1beta1.BasicAllowance",
                value: Uint8Array.from(
                    BasicAllowance.encode({
                        expiration: undefined,
                        // spendLimit: [{ amount: (3_500_000).toString(10), denom: Omnistar.denom }],
                        spendLimit: [{ amount: (50 * Omnistar.ost).toString(10), denom: Omnistar.denom }], 
                    }).finish(),
                ),
            };
            const grantMsg = {
                typeUrl: "/cosmos.feegrant.v1beta1.MsgGrantAllowance",
                value: MsgGrantAllowance.fromPartial({
                    granter: omnistar.address,
                    grantee: to,
                    allowance: allowance,
                }),
            };
            const messages = [grantMsg];
            // const transaction = {};

            const stdFee: StdFee = await omnistar.genStdFeeObj(11, { memo: "", messages });

            const { 
                code, 
                events, 
                gasUsed, 
                gasWanted, 
                height, 
                transactionHash, 
                data 
            } = await omnistar.signingClient!.signAndBroadcast(omnistar.address, [grantMsg], stdFee, "Create allowance for gas payment using in new user accoutn creation");

            console.log({ code, events, gasUsed, gasWanted, height, transactionHash, data });
        }
        catch (e: any) {
            console.error('Faucet failed');
            console.error(e);
            return false;
        }
        return true;
    }
    
    async searchIndexedTx(address: string): Promise<readonly IndexedTx[]> {
        const connection = await this.connect();
        if(!connection) {
            console.error('No conection!')
            return [];
        }
        return await connection.searchTx({ sentFromOrTo: address });
    }

    encodeMessages(messages: IMsgCreateData[]): readonly EncodeObject[] {
        const [ msgCreateData ] = Omnistar.messagesTypes;
        const [ msgType ] = msgCreateData;
        return messages.map((msg: IMsgCreateData) => {
            return {
                typeUrl: msgType,
                value: MsgCreateData.fromPartial({
                    creator: this.address,
                    destination: msg.destination,
                    data: msg.data
                })
            }
        });
    }

    async createMessages({
        to,
        pubkey,
        fee,
        messages
    }: {
        to?: string,
        pubkey: Uint8Array,
        fee?: number,
        messages: IMsgCreateData[]
    }): Promise<TxResponse>{
        return await this.createTransaction(
            to ?? '', 
            pubkey, 
            fee ?? await this.getGasPrice(), 
            this.encodeMessages(messages) ?? [], 
            Omnistar.denom
        );
    }
}