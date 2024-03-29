import { TypesBuilder } from "./builders/types.builder";
import { JoiBuilder } from "./builders/joi.builder";
import { ParsersEnum } from "./enums/parsers.enum";
import { Options } from "./types/options.type";
import { ParserFactory } from "./parsers/parser.factory";
import { IBuilder } from "./interfaces/builder.interface";

export class OasToJoi {
  protected joiBuilder: IBuilder;
  protected typesBuilder: IBuilder;

  constructor(type: string = ParsersEnum.YAML, options: Options) {
    const parser = ParserFactory.getParser(type, {
      fileName: options.fileName,
    });

    this.joiBuilder = new JoiBuilder(parser, options.outputDir);
    this.typesBuilder = new TypesBuilder(parser, options.outputDir);
  }

  dumpJoiSchemas() {
    this.joiBuilder.dump();
  }

  dumpTypes() {
    this.typesBuilder.dump();
  }
}
