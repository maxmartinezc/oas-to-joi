import { OpenAPIV3 } from "openapi-types";
import { IBuilder } from "../interfaces/builder.interface";
import { IParser } from "../interfaces/parser.interface";
import { SourceObject } from "../types/source-object.type";
import { IOHelper } from "../helpers/io.helper";
import { Definitions } from "../types/definitions.type";
import { JoiEnum } from "../enums/joi.enum";
import { Utils } from "../utils";
import mergeTsTpl from "../templates/joi.tpl";

const HEADER_JOI_IMPORT = "import Joi from 'joi';";

export class JoiBuilder implements IBuilder {
  data: OpenAPIV3.Document;
  readonly outputDir: string;
  private CONTENT_TYPE = "application/json";
  protected fileNameExtension = ".ts";

  protected propRegEx = /\{(.*?)\}/;
  protected requiredFieldRegEx = /(.*?)\[\*\]/;
  protected refTypeRegEx = [
    /\*\*Array\<(.*?)\>\*\*/,
    /\*\*Joi\.array\(\)\.items\((.*?)\)\*\*/,
    /\*\*(.*?)\*\*/,
  ];

  constructor(
    readonly parser: IParser,
    outputDir: string,
  ) {
    this.outputDir = `${outputDir}/joi`;
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
              `{${name}: ${JoiEnum.ARRAY(def["items"]["type"])}}`,
            );
          } else {
            const refName = def["items"]["$ref"].split("/").pop();
            defs[schemaName].props.push(
              `{${name}: **${JoiEnum.ARRAY_REF(refName)}**}`,
            );
            defs[schemaName].refs.push(refName);
          }
          break;
        case "enum":
          defs[schemaName].props.push(
            `{${name}: ${JoiEnum.ENUM(def["enum"], def["type"])}}`,
          );
          break;
        default:
          defs[schemaName].props.push(
            `{${name}: ${JoiEnum[type.toUpperCase()]}}}`,
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

  render(item: SourceObject): Array<string | string> {
    const typeName = Object.keys(item)[0];
    const { props } = item[typeName];

    const mergedTemplate = mergeTsTpl({
      imports: this.renderImports(props),
      body: this.renderBody(props),
    });

    return [this.makeName(typeName), `${Utils.clean(mergedTemplate)}`];
  }

  protected renderImports(values: Array<string>): string {
    const imports = [];
    let needsJoiImport = false;
    for (const refType of values) {
      for (const regExp of this.refTypeRegEx) {
        const match = Utils.matches(refType, regExp);
        if (!needsJoiImport && refType.includes("Joi.")) {
          needsJoiImport = true;
        }

        if (match) {
          const [name] = this.makeName(match).split(this.fileNameExtension);
          imports.push(`import ${match} from "./${name}";`);
          break;
        }
      }
    }
    if (needsJoiImport) {
      imports.unshift(HEADER_JOI_IMPORT);
    }
    return imports.join("\n");
  }

  protected makeName(value: string) {
    const name = Utils.toKebabCase(value);
    return `${name}.schema${this.fileNameExtension}`;
  }

  protected renderBody(values: Array<string>): string {
    const props: Array<string> = [];
    const spliter = ":";

    for (const prop of values) {
      const [field, type] = Utils.matches(prop, this.propRegEx).split(spliter);

      const name = Utils.matches(field, this.requiredFieldRegEx);
      const isRequired = name ? true : false;
      props.push(
        `\u0020\u0020${name || field}${spliter}\u0020${this.makeJoiProps({
          item: type,
          isRequired,
        })}`,
      );
    }
    return this.makeJoiObject(props, spliter);
  }

  protected makeJoiObject(props: string[], spliter: string) {
    let joiObjectDefinition = "";
    if (props.length == 1) {
      const [name, value] = Utils.clean(props[0]).split(spliter);
      if (name.trim() === value.trim()) {
        joiObjectDefinition = value.trim();
      }
    } else {
      joiObjectDefinition = `${JoiEnum.OBJECT}({\n${props.join(",\n")}\n})`;
    }
    return joiObjectDefinition;
  }

  protected makeJoiProps(options: { item: string; isRequired: boolean }) {
    const [tmp, values] = options.item.split(";");
    const type = tmp.replace(/\s/g, "");
    const definition = `${type}${this.makeArrayValues(type, values)}`;

    return options.isRequired ? this.makeRequiredField(definition) : definition;
  }

  protected makeRequiredField(value: string): string {
    return `${value}${JoiEnum.REQUIRED}`;
  }

  protected makeArrayValues(type: string, values: string): string {
    const stringDelimiter = type == JoiEnum.STRING ? '"' : "";

    return values
      ? `.valid(${stringDelimiter}${values
          .split("|")
          .join(
            "" + stringDelimiter + "," + stringDelimiter + "",
          )}${stringDelimiter})`
      : "";
  }

  protected async writeFile(data: Array<SourceObject>) {
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
