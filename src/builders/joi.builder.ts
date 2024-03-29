import { OpenAPIV3 } from "openapi-types";
import { IBuilder } from "../interfaces/builder.interface";
import { IParser } from "../interfaces/parser.interface";
import { JoiTpl } from "../templates/joi.tpl";
import { SourceObject } from "../types/source-object.type";
import { IOHelper } from "../helpers/io.helper";
import { Definitions } from "../types/definitions.type";

export class JoiBuilder implements IBuilder {
  template: JoiTpl;
  data: OpenAPIV3.Document;
  readonly outputDir: string;
  private CONTENT_TYPE = "application/json";

  constructor(
    readonly parser: IParser,
    outputDir: string,
  ) {
    this.template = new JoiTpl();
    this.outputDir = `${outputDir}/${this.template.outputDir}`;
    this.parser.load();
    this.data = this.parser.export();
  }

  dump(): void {
    const { operations, schemas } = this.makeDefinitions();
    this.writeFile([...operations, ...schemas]);
  }

  protected makeDefinitions(): Definitions {
    const operations: Array<SourceObject> = [];
    const schemas: Array<SourceObject> = [];

    Object.entries(this.getOperations(this.data)).forEach(([, ref]) => {
      const schema = <OpenAPIV3.SchemaObject>(
        this.data.components.schemas[ref[1]]
      );
      operations.push(this.getOperationSchemaObjects(ref[0], ref[1]));
      schemas.push(this.makeTemplateObject(ref[1], schema));
    });

    schemas.push(...this.getRefs(schemas));
    return { operations, schemas };
  }

  protected getRefs(parentDefs = []): Array<SourceObject> {
    const defs = [];
    const refs = [
      ...new Set(
        parentDefs
          .map((item) => {
            return item[Object.keys(item)[0]].refs;
          })
          .flat(),
      ),
    ];

    refs.forEach((item) => {
      const schema = <OpenAPIV3.SchemaObject>this.data.components.schemas[item];
      defs.push(this.makeTemplateObject(item, schema));
    });

    return defs;
  }

  protected getOperations(data: OpenAPIV3.Document) {
    const operations = [];

    Object.entries(data.paths).forEach(([urlPath, sc]) => {
      Object.entries(sc).forEach(([method, op]) => {
        const operation = <OpenAPIV3.OperationObject>op;
        const requestBody = <OpenAPIV3.RequestBodyObject>operation.requestBody;
        if (requestBody) {
          const content = requestBody.content[this.CONTENT_TYPE] || null;
          if (content) {
            const { $ref } = <OpenAPIV3.ReferenceObject>content.schema;
            if ($ref) {
              const refName = $ref.split("/").pop();
              const name = operation.operationId || method + urlPath + refName;
              operations.push([name, refName]);
            }
          }
        }
      });
    });
    return operations;
  }

  protected makeTemplateObject(
    schemaName: string,
    schema: OpenAPIV3.SchemaObject,
  ): SourceObject {
    const defs: SourceObject = {
      [schemaName]: {
        props: [],
        refs: [],
      },
    };

    Object.entries(schema.properties).forEach(([propName, def]) => {
      const required = schema.required?.indexOf(propName) >= 0 ? "[*]" : "";

      const name = `${propName}${required}`;

      if (def["$ref"]) {
        const refName = def["$ref"].split("/").pop();
        defs[schemaName].props.push(`{${name}: **${refName}**}`);
        defs[schemaName].refs.push(refName);
        return;
      }

      const type = (def["enum"] ? "enum" : null) || def["type"];

      switch (type) {
        case "array":
          if (def["items"]["type"]) {
            defs[schemaName].props.push(
              `{${name}: ${this.template
                .mapArrayType()
                .array(def["items"]["type"])}}`,
            );
          } else {
            const refName = def["items"]["$ref"].split("/").pop();
            defs[schemaName].props.push(
              `{${name}: **${this.template.mapArrayType().arrayRef(refName)}**}`,
            );
            defs[schemaName].refs.push(refName);
          }
          break;
        case "enum":
          defs[schemaName].props.push(
            `{${name}: ${this.template
              .mapEnumType()
              .enum(def["enum"], def["type"])}}`,
          );
          break;
        default:
          defs[schemaName].props.push(
            `{${name}: ${this.template.mapPrimitiveType(type)}}`,
          );
          break;
      }
    });
    return defs;
  }

  protected getOperationSchemaObjects(
    operationName: string,
    schemaName: string,
  ): SourceObject {
    const defs: SourceObject = {
      [operationName]: {
        props: [],
        refs: [],
      },
    };

    defs[operationName].props.push(`{${schemaName}: **${schemaName}**}`);
    return defs;
  }

  protected async writeFile(data: Array<SourceObject>) {
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
