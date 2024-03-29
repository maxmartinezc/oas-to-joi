import { ParsersEnum } from "../enums/parsers.enum";
import { ParserOptions } from "../types/parser-options.type";
import { IParser } from "../interfaces/parser.interface";
import { JSONParser } from "./json.parser";
import { YAMLParser } from "./yaml.parser";

export class ParserFactory {
  static getParser(type: string, parserOptions: ParserOptions): IParser {
    switch (type) {
      case ParsersEnum.YAML:
        return new YAMLParser(parserOptions);
      case ParsersEnum.JSON:
        return new JSONParser(parserOptions);
      default:
        throw new Error(`Factory for ${type} is not implemented`);
    }
  }
}
