import { ParsersEnum } from "../enums/parsers.enum";
import { ParserOptions } from "../types/parser-options.type";
import { IParser } from "../interfaces/parser.interface";
import { JSONParser } from "./json.parser";
import { YAMLParser } from "./yaml.parser";

export class ParserFactory {
  static getParser(options: { type: string; config: ParserOptions }): IParser {
    switch (options.type) {
      case ParsersEnum.YAML:
        return new YAMLParser(options.config);
      case ParsersEnum.JSON:
        return new JSONParser(options.config);
      default:
        throw new Error(`Factory for ${options.type} is not implemented`);
    }
  }
}
