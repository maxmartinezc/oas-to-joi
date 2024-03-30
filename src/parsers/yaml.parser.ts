import YAML from "yaml";
import fs from "fs";
import { IParser } from "../interfaces/parser.interface";
import { ParserOptions } from "../types/parser-options.type";
import { OasToJoiError } from "../errors";

export class YAMLParser implements IParser {
  options: ParserOptions;
  data: any;
  constructor(options: ParserOptions) {
    this.options = options;
  }

  load() {
    try {
      const fileBuffer = fs.readFileSync(this.options.sourceFileName, "utf8");
      this.data = YAML.parse(fileBuffer);
    } catch (e) {
      throw new OasToJoiError(e.message);
    }
  }

  export(): any {
    return this.data;
  }
}
