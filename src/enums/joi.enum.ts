import { Utils } from "../utils";

export const JoiEnum = {
  INTEGER: "Joi.number()",
  STRING: "Joi.string()",
  BOOLEAN: "Joi.boolean()",
  REQUIRED: ".required()",
  ARRAYS: "Joi.array()",
  OBJECT: "Joi.object",
  ARRAY: (value: string) =>
    `${JoiEnum.ARRAYS}.items(${JoiEnum[value.toUpperCase()]})`,
  ARRAY_REF: (value: string) =>
    `${JoiEnum.ARRAYS}.items(${Utils.capitalizeWord(value)})`,
  ENUM: (value: Array<any>, type: string) =>
    `${JoiEnum[type.toUpperCase()]};${value.join("|")}`,
};
