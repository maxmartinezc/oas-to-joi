import { OpenAPIV3 } from "openapi-types";
import { TypeScriptTpl } from "../templates/type-script.tpl";
import { JoiTpl } from "../templates/joi.tpl";
import { IParser } from "./parser.interface";

export interface IBuilder {
  readonly data: OpenAPIV3.Document;
  readonly template: TypeScriptTpl | JoiTpl;
  readonly parser: IParser;
  readonly outputDir: string;
  dump: () => void;
}
