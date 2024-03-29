import { OpenAPIV3 } from "openapi-types";
import { IBuilder } from "../interfaces/builder.interface";
import { TypeScriptTpl } from "../templates/type-script.tpl";
import { IParser } from "../interfaces/parser.interface";
import { Utils } from "../utils";
import { IOHelper } from "../helpers/io.helper";

export class TypesBuilder implements IBuilder {
  template: TypeScriptTpl;
  data: OpenAPIV3.Document;
  readonly parser: IParser;
  readonly outputDir: string;

  constructor(parser: IParser, outputDir: string) {
    this.parser = parser;
    this.outputDir = `${outputDir}/types`;
    this.template = new TypeScriptTpl();
  }

  dump(): void {
    this.parser.load();
    this.data = this.parser.export();
    const defs: Array<string> = [];
    Object.entries(this.data.components.schemas).forEach(([name, sc]) => {
      const schema = <OpenAPIV3.SchemaObject>sc;
      defs.push(
        `{{{${Utils.capitalizeWord(name)}}}}_${this.getSchema(schema).join(
          ",",
        )}`,
      );
    });
    this.writeFile(defs);
  }

  getSchema(schema: OpenAPIV3.SchemaObject) {
    const properties: Array<string> = [];

    Object.entries(schema.properties).forEach(([propName, def]) => {
      if (def["$ref"]) {
        properties.push(`{${propName}: **${def["$ref"].split("/").pop()}**}`);
        return;
      }

      const type = (def["enum"] ? "enum" : null) || def["type"];

      switch (type) {
        case "array":
          if (def["items"]["type"]) {
            properties.push(
              `{${propName}: ${this.template
                .mapArrayType()
                .array(def["items"]["type"])}}`,
            );
          } else {
            const arrRef = `**${def["items"]["$ref"].split("/").pop()}**`;
            properties.push(
              `{${propName}: ${this.template.mapArrayType().arrayRef(arrRef)}}`,
            );
          }
          break;
        case "enum":
          properties.push(
            `{${propName}: ${this.template.mapEnumType().enum(def["enum"])}}`,
          );
          break;
        default:
          properties.push(
            `{${propName}: ${this.template.mapPrimitiveType(type)}}`,
          );
          break;
      }
    });
    return properties;
  }

  protected async writeFile(data: Array<string>) {
    const targetDirectory = this.outputDir;
    IOHelper.createFolder(targetDirectory);
    for (const item of data) {
      const [fileName, content] = this.template.render(item);
      await IOHelper.writeFile({
        fileName,
        content,
        targetDirectory: this.outputDir,
      });
    }
  }
}
