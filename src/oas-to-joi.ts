import { JoiBuilder } from "./builders/joi.builder";
import { ParsersEnum } from "./enums/parsers.enum";
import { Options } from "./types/options.type";
import { ParserFactory } from "./parsers/parser.factory";
import { IBuilder } from "./interfaces/builder.interface";
import { TypeScriptBuilder } from "./builders/ts.builder";

export class OasToJoi {
  protected joiBuilder: IBuilder;
  protected typesBuilder: IBuilder;

  constructor(options: Options) {
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
    console.log(
      "\n==========================",
      "\nDumping Joi Files ✨",
      "\n==========================",
    );
    const totalFiles = await this.joiBuilder.dump();
    console.log(`Done (${totalFiles}) Files`);
  }

  async dumpTypes() {
    console.log(
      "\n===========================",
      "\nDumping TypeScript Files ✨",
      "\n===========================",
    );
    const totalFiles = await this.typesBuilder.dump();
    console.log(`Done (${totalFiles}) Files`);
  }
}
