import { OpenAPIV3 } from "openapi-types";
import { ParserOptions } from "../types/parser-options.type";

export interface IParser {
  readonly options: ParserOptions;
  readonly data: any;
  load: () => void;
  export: () => OpenAPIV3.Document;
}
