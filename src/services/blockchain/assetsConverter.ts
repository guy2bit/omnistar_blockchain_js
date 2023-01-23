const conversionTable:any = {
    "ETH":10**9
}
export function convertFromSmallCoin (asset:string, amount:number):number  {
    let _rate = conversionTable[asset];
    return amount/_rate;
}

export function convertToSmallCoin (asset:string, amount:number):number  {
    let _rate = conversionTable[asset];
    return amount*_rate;
}