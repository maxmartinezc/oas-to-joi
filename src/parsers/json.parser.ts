import { ParserOptions } from "../types/parser-options.type";
import { IParser } from "../interfaces/parser.interface";
import { OpenAPIV3 } from "openapi-types";

export class JSONParser implements IParser {
  options: ParserOptions;
  data: any;

  constructor(options: ParserOptions) {
    this.options = options;
  }

  load() {
    throw Error("Not implemented");
  }

  export(): OpenAPIV3.Document {
    throw Error("Not implemented");
  }
}
