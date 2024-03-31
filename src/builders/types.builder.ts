import { OpenAPIV3 } from "openapi-types";
import { IBuilder } from "../interfaces/builder.interface";
import { IParser } from "../interfaces/parser.interface";
import { Utils } from "../utils";
import { IOHelper } from "../helpers/io.helper";
import { TSEnum } from "../enums/ts.enum";
import mergeTsTpl from "../templates/ts.tpl";

export class TypesBuilder implements IBuilder {
  data: OpenAPIV3.Document;
  readonly parser: IParser;
  readonly outputDir: string;
  private nameRegEx = /\{\{\{(.*?)\}\}\}/;
  private propRegEx = /\{(.*?)\}/;
  private refTypeRegEx = /\*\*(.*?)\*\*/;

  constructor(parser: IParser, outputDir: string) {
    this.parser = parser;
    this.outputDir = `${outputDir}/types`;
  }

  dump(): void {
    this.parser.load();
    this.data = this.parser.export();

    this.writeFile(this.makeDefinitions());
  }

  protected makeDefinitions(): Array<string> {
    const defs: Array<string> = [];
    Object.entries(this.data.components.schemas).forEach(([name, sc]) => {
      const schema = <OpenAPIV3.SchemaObject>sc;
      defs.push(
        `{{{${Utils.capitalizeWord(name)}}}}_${this.getSchema(schema).join(
          ",",
        )}`,
      );
    });
    return defs;
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
              `{${propName}: ${TSEnum.ARRAY(def["items"]["type"])}}`,
            );
          } else {
            const arrRef = `**${def["items"]["$ref"].split("/").pop()}**`;
            properties.push(`{${propName}: ${TSEnum.ARRAY_REF(arrRef)}}`);
          }
          break;
        case "enum":
          properties.push(`{${propName}: ${TSEnum.ENUM(def["enum"])}}`);
          break;
        default:
          properties.push(`{${propName}: ${TSEnum[type.toUpperCase()]}}`);
          break;
      }
    });
    return properties;
  }

  render(item: string): Array<string | string> {
    const [typeNamePart, propertyPart] = item.split("_");
    const name = Utils.matches(typeNamePart, this.nameRegEx);
    const mergedTemplate = mergeTsTpl({
      name,
      imports: this.renderImports(propertyPart.split(",")),
      body: this.renderBody(propertyPart.split(",")),
    });
    return [this.makeName(name).join(""), `${Utils.clean(mergedTemplate)}\n`];
  }

  private makeName(value: string) {
    const name = Utils.toKebabCase(value);
    return [`${name}.type`, ".ts"];
  }

  private renderBody(values: Array<string>): string {
    const props: Array<string> = [];
    for (const prop of values) {
      props.push(`\u0020\u0020${Utils.matches(prop, this.propRegEx)}`);
    }
    return props.join(",\n");
  }

  private renderImports(values: Array<string>): string {
    const imports: Array<string> = [];
    for (const refType of values) {
      const match = Utils.matches(refType, this.refTypeRegEx);
      if (match) {
        const [name] = this.makeName(match);
        imports.push(`import { ${match} } from "./${name}";`);
      }
    }
    return imports.join("\n");
  }

  protected async writeFile(data: Array<string>) {
    const targetDirectory = this.outputDir;
    IOHelper.createFolder(targetDirectory);
    for (const item of data) {
      const [fileName, content] = this.render(item);
      await IOHelper.writeFile({
        fileName,
        content,
        targetDirectory: this.outputDir,
      });
    }
  }
}
