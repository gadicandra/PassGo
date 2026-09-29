import type { SchemaOptions } from "mongoose";
import { uuidv7 } from "../utils/uuid";

export const idField = { type: String, default: uuidv7 };

interface Options {
  hide?: string[];
  updatedAt?: boolean;
  timestamps?: boolean;
}

export function schemaOptions(
  collection: string,
  opts: Options = {},
): SchemaOptions {
  const { hide = [], updatedAt = true, timestamps = true } = opts;
  return {
    collection,
    versionKey: false,
    timestamps: timestamps ? { createdAt: true, updatedAt } : false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id;
        delete ret._id;
        for (const key of hide) delete ret[key];
        return ret;
      },
    },
  };
}
