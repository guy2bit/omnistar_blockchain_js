import { coins, encodeSecp256k1Pubkey, StdFee } from "@cosmjs/amino";
import { Any } from "cosmjs-types/google/protobuf/any";
import { Uint53 } from "@cosmjs/math";
import { EncodeObject, Registry } from "@cosmjs/proto-signing/build/registry";
import { Account, QueryClient, setupFeegrantExtension, StargateClient, StargateClientOptions } from "@cosmjs/stargate";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
// import utils from '@cosmjs/utils';
import { CosmosSdkTransactionResponse } from "./types";
import bigDecimal from 'js-big-decimal';
import { Json } from "./omnistar/types";

export interface LocalStargateClient { 
    address: string;
    bufferPubkey: Uint8Array;
    denom: string;
    gasPrice: number;
    registry?: Registry;
}

export class LocalStargate extends StargateClient {

    localClient: LocalStargateClient

    constructor(localClient: LocalStargateClient, tmClient: Tendermint34Client, options: StargateClientOptions){
        super(tmClient, options);
        this.localClient = localClient;
    }

    static async localConnect(localClient: LocalStargateClient, endpoint: string, options: StargateClientOptions = {}): Promise<LocalStargate>{
        const tmClient: Tendermint34Client = await Tendermint34Client.connect(endpoint);
        let res = new LocalStargate(localClient, tmClient, options);
        if(localClient.bufferPubkey.length === 0){
            const pubkey = (await res.getAccount(localClient.address))?.pubkey?.value;
            if(pubkey){
                res.localClient.bufferPubkey = Uint8Array.from(
                    Buffer.from(pubkey, "base64")
                );
            }
        }
        return res;
    }

    async checkAllowance(): Promise<{ grantee: string; granter: string; allowance?: Any; }[] | undefined> {
        try {
            const tmClient: Tendermint34Client | undefined = this.getTmClient();
            if(!tmClient) throw new Error('undefined Tendermint34Client at checkAllowance!');
            const queryClient = QueryClient.withExtensions(tmClient, setupFeegrantExtension);
            const { address } = this.localClient;
            const grantee = address;
            const { 
                allowances, 
                // pagination 
            } = await queryClient.feegrant.allowances(grantee);
            // console.log({ pagination });
            if(allowances.length === 0) 
                throw new Error('No any allowances');

            return allowances;
        } catch(e: any) {
            console.log(e);
            return undefined;
        }
    }

    async estimateFee({ messages, memo }: { messages: readonly EncodeObject[], memo: string }): Promise<number>{
        try{
            const { registry, address, bufferPubkey } = this.localClient;
            if(!registry) throw new Error("missing registry");
            const anyMsgs = messages.map((m) => registry.encodeAsAny(m));
            const { sequence } = await this.getSequence(address);
            const encodedPubkey = encodeSecp256k1Pubkey(bufferPubkey);
            const { gasInfo } = await this.forceGetQueryClient().tx.simulate(anyMsgs, memo, encodedPubkey, sequence);
            if(!gasInfo) throw new Error("No gasInfo");
            const gas = Uint53.fromString(gasInfo.gasUsed.toString()).toNumber();
            return Math.ceil(gas * 1.3);
        }
        catch(e: any){
            console.error('Fetch estimated fee failed...');
            console.error(e);
        }
        return 200_000;
    }

    async genStdFeeObj(feePerGasUnit: number, { messages, memo }: { messages: readonly EncodeObject[]; memo?: string; gasBytes?: number; }): Promise<StdFee>{
        const { address, denom, gasPrice } = this.localClient;
        try{
            const allowanceExists = await this.checkAllowance();
            let granter: string | undefined = undefined;
            if(allowanceExists){
                const allowance = allowanceExists!.find(({ grantee })=>grantee === address);
                if(allowance) granter = allowance.granter;
            }
            let gasLimit = await this.estimateFee({ messages, memo: memo ?? "" });
            // increase the limit in more 3% (on the recent 3%) to prevernt the risk of low limit
            gasLimit = Math.ceil(gasLimit * 1.3);
            // x = 11nost * gasLimit
            let proposedFeeNost = Math.ceil(gasLimit * (feePerGasUnit ?? gasPrice))
            let fee: StdFee = {
                amount: coins(proposedFeeNost, denom), 
                gas: gasLimit.toString(10)
            };
            if(granter)
                fee = {...fee, ...{granter}};
            else 
                fee = {...fee, ...{payer: address}}
            return fee;
        }
        catch(e: any){
            console.error('Generate StdFee object failed');
            console.error(e);
        }
        return {
            amount: coins(1, denom), 
            gas: (20_000_000).toString(10),
            payer: address
        }
    }
}

export default class CosmosUtils {
    static upperFirstLetter = (str: string) =>
        str.substring(0, 1).toLocaleUpperCase() + str.substring(1).toLocaleLowerCase()

    static hashFromTx = (tx: CosmosSdkTransactionResponse): string => tx!.data!.tx_response.txhash;

    static queryJsonToString(query?: Json): string {
        if (!query) return '';
        let queryString: string = '';
        for (let param of Object.keys(query)) {
            const key: string = param;
            const val: string = query[param];
            if (queryString !== '')
                queryString += '&';

            queryString += `${key}=${val}`;
        }
        return queryString;
    }

    static createdAtToTS(createdAt: string): Date{
        return new Date(Number(createdAt) * 1000);
    }
}

export function prettyNumber(num: string, point: number) { 
	try {
		
		const splitted = new bigDecimal(num).getValue().split('.');//.getPrettyValue(3, ',').split('.');
		const before = splitted[0];
		if (!splitted[1])
		return before;
		
		let after = splitted[1].substring(0, point);
		if (after.length < point)
		for (let i = 0, j = point - after.length; i < j; i++) after += '0';
		return point > 0
		? before + '.' + after
		: before;
	} catch (e: unknown) {
		console.error(e);
		return "0.00"
	}
}

export function hexToDec(hex: string): string {
	let i: number;
	let j: number
	let digits: number[] = [0]
	let carry: number;
	for (i = 0; i < hex.length; i += 1) {
		carry = parseInt(hex.charAt(i), 16);
		for (j = 0; j < digits.length; j += 1) {
			digits[j] = digits[j] * 16 + carry;
			carry = digits[j] / 10 | 0;
			digits[j] %= 10;
		}
		while (carry > 0) {
			digits.push(carry % 10);
			carry = carry / 10 | 0;
		}
	}
	return digits.reverse().join('');
}