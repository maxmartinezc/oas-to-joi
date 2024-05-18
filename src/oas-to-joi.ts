import { JoiBuilder } from "./builders/joi.builder";
import { ParsersEnum } from "./enums/parsers.enum";
import { Options } from "./types/options.type";
import { ParserFactory } from "./parsers/parser.factory";
import { IBuilder } from "./interfaces/builder.interface";
import { TypeScriptBuilder } from "./builders/ts.builder";
import { Utils } from "./utils";
import OpenAPIParser from "@readme/openapi-parser";

export class OasToJoi {
  protected joiBuilder: IBuilder;
  protected typesBuilder: IBuilder;
  private isApiValidated: boolean;

  constructor(private options: Options) {
    const parser = ParserFactory.getParser({
      type: ParsersEnum.YAML,
      config: {
        sourceFileName: options.sourceFileName,
      },
    });

    this.joiBuilder = new JoiBuilder(parser, options.outputDir);
    this.typesBuilder = new TypeScriptBuilder(parser, options.outputDir);
  }

  async dumpJoiSchemas() {
    try {
      await this.validate(this.options.sourceFileName);
      Utils.consoleTitleMessage("Dumping Joi Files ✨");
      const totalFiles = await this.joiBuilder.dump();
      Utils.consoleMessage({ message: `Done (${totalFiles}) Files` });
    } catch (error) {
      Utils.consoleMessage({ message: error.message });
    }
  }

  async dumpTypes() {
    try {
      await this.validate(this.options.sourceFileName);
      Utils.consoleTitleMessage("Dumping TypeScript Files ✨");
      const totalFiles = await this.typesBuilder.dump();
      Utils.consoleMessage({ message: `Done (${totalFiles}) Files` });
    } catch (error) {
      Utils.consoleMessage({ message: error.message });
    }
  }

  private async validate(oasDocPath: string): Promise<void> {
    if (this.isApiValidated) return;
    Utils.consoleTitleMessage(`Validating Open API Specifications`);

    const {
      info: { title, version },
    } = await OpenAPIParser.validate(oasDocPath);
    Utils.consoleMessage({
      message: `Validation OK:\nAPI name: ${title}, Version:${version}`,
      underline: true,
    });
    this.isApiValidated = true;
  }
}
