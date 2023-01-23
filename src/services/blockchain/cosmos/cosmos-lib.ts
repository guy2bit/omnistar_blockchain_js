import { Secp256k1Wallet, StdSignDoc } from '@cosmjs/amino'
import { Slip10, Slip10Curve, Secp256k1, stringToPath } from '@cosmjs/crypto'
import { fromHex } from '@cosmjs/encoding'
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing'
// @ts-expect-error
import { SignDoc } from '@cosmjs/proto-signing/build/codec/cosmos/tx/v1beta1/tx'
import * as bip39 from 'bip39';

/**
 * Constants
 */
const DEFAULT_PATH = "m/44'/118'/0'/0/0"
const DEFAULT_PREFIX = 'cosmos'

/**
 * Types
 */
interface IInitArguments {
  mnemonic?: string
  path?: string
  prefix?: string
}

class Keyring {
  mnemonic: string;

  constructor(mnemonic: string) {
    this.mnemonic = mnemonic;
  }

  protected getBuffPrivKey(path: string): Uint8Array {
    const { privkey } = Slip10.derivePath(
      Slip10Curve.Secp256k1,
      bip39.mnemonicToSeedSync(this.mnemonic),
      stringToPath(path ?? DEFAULT_PATH)
    );
    return privkey;
  }

  getPrivateKey = (path: string): string =>
    Buffer.from(this.getBuffPrivKey(path)).toString("hex");

  getKeyPair = async (path: string): Promise<{ privkey: Uint8Array, pubkey: Uint8Array }> =>
    await Secp256k1.makeKeypair(this.getBuffPrivKey(path))

  static init = ({ mnemonic }: { mnemonic: string }) =>
    new Keyring(mnemonic);

  static generateMnemonic = (): string =>
    bip39.generateMnemonic();
}

/**
 * Library
 */
export default class CosmosLib {
  private keyring: Keyring
  private directSigner: DirectSecp256k1Wallet
  private aminoSigner: Secp256k1Wallet

  constructor(keyring: Keyring, directSigner: DirectSecp256k1Wallet, aminoSigner: Secp256k1Wallet) {
    this.directSigner = directSigner
    this.keyring = keyring
    this.aminoSigner = aminoSigner
  }

  static async init({ mnemonic, path, prefix }: IInitArguments) {
    const keyring = Keyring.init({ mnemonic: mnemonic ?? Keyring.generateMnemonic() });
    const privateKey = fromHex(keyring.getPrivateKey(path ?? DEFAULT_PATH))
    const directSigner = await DirectSecp256k1Wallet.fromKey(privateKey, prefix ?? DEFAULT_PREFIX)
    const aminoSigner = await Secp256k1Wallet.fromKey(privateKey, prefix ?? DEFAULT_PREFIX)
    return new CosmosLib(keyring, directSigner, aminoSigner)
  }

  public getMnemonic() {
    return this.keyring.mnemonic
  }

  public async getAddress() {
    const account = await this.directSigner.getAccounts()
    return account[0].address
  }

  public async signDirect(address: string, signDoc: SignDoc) {
    return await this.directSigner.signDirect(address, signDoc)
  }

  public async signAmino(address: string, signDoc: StdSignDoc) {
    return await this.aminoSigner.signAmino(address, signDoc)
  }
}

/**
 * Utilities
 */
export let wallet: CosmosLib
export let cosmosWallets: Record<string, CosmosLib>
export let cosmosAddresses: string[]
let address: string

export async function createOrRestoreCosmosWallet() {
  const mnemonic = localStorage.getItem('COSMOS_MNEMONIC')
  if (mnemonic) {
    wallet = await CosmosLib.init({ mnemonic });
  } else {
    wallet = await CosmosLib.init({});
    // Don't store mnemonic in local storage in a production project!
    localStorage.setItem('COSMOS_MNEMONIC', wallet.getMnemonic());
  }

  address = await wallet.getAddress();

  cosmosWallets = { [address]: wallet };
  cosmosAddresses = Object.keys(cosmosWallets);

  return { cosmosWallets, cosmosAddresses };
}

