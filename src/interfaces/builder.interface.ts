import { OpenAPIV3 } from "openapi-types";
import { IParser } from "./parser.interface";

export interface IBuilder {
  readonly data: OpenAPIV3.Document;
  readonly parser: IParser;
  readonly outputDir: string;
  dump: () => void;
}
