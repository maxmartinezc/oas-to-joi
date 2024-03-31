import { Utils } from "../utils";

export const TSEnum = {
  INTEGER: "number",
  STRING: "string",
  BOOLEAN: "boolean",
  ARRAY: (value: string) => `Array<${value}>`,
  ARRAY_REF: (value: string) => `Array<${Utils.capitalizeWord(value)}>`,
  ENUM: (value: Array<any>) => `"${value.join('" | "')}"`,
};
