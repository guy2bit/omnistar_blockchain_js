import _m0 from "protobufjs/minimal";
import Long from "long";
import { DeepPartial, Exact, isSet, longToNumber } from "../tx";

export interface IMsgCreateData {
    creator: string;
    destination: string;
    data: string;
}

export interface IMsgCreateDataResponse {
    id: number;
}

function createBaseMsgCreateData(): IMsgCreateData {
    return { creator: "", destination: "", data: "" };
}

export const MsgCreateData = {
    encode(message: IMsgCreateData, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.creator !== "") {
            writer.uint32(10).string(message.creator);
        }
        if (message.destination !== "") {
            writer.uint32(18).string(message.destination);
        }
        if (message.data !== "") {
            writer.uint32(26).string(message.data);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): IMsgCreateData {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseMsgCreateData();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.creator = reader.string();
                    break;
                case 2:
                    message.destination = reader.string();
                    break;
                case 3:
                    message.data = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): IMsgCreateData {
        return {
            creator: isSet(object.creator) ? String(object.creator) : "",
            destination: isSet(object.destination) ? String(object.destination) : "",
            data: isSet(object.data) ? String(object.data) : "",
        };
    },

    toJSON(message: IMsgCreateData): unknown {
        const obj: any = {};
        message.creator !== undefined && (obj.creator = message.creator);
        message.destination !== undefined && (obj.destination = message.destination);
        message.data !== undefined && (obj.data = message.data);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<IMsgCreateData>, I>>(object: I): IMsgCreateData {
        const message = createBaseMsgCreateData();
        message.creator = object.creator ?? "";
        message.destination = object.destination ?? "";
        message.data = object.data ?? "";
        return message;
    },
};

function createBaseMsgCreateDataResponse(): IMsgCreateDataResponse {
    return { id: 0 };
}

export const MsgCreateDataResponse = {
    encode(message: IMsgCreateDataResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.id !== 0) {
            writer.uint32(8).uint64(message.id);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): IMsgCreateDataResponse {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseMsgCreateDataResponse();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.id = longToNumber(reader.uint64() as Long);
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): IMsgCreateDataResponse {
        return { id: isSet(object.id) ? Number(object.id) : 0 };
    },

    toJSON(message: IMsgCreateDataResponse): unknown {
        const obj: any = {};
        message.id !== undefined && (obj.id = Math.round(message.id));
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<IMsgCreateDataResponse>, I>>(object: I): IMsgCreateDataResponse {
        const message = createBaseMsgCreateDataResponse();
        message.id = object.id ?? 0;
        return message;
    },
};
