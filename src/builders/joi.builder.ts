import { OpenAPIV3 } from "openapi-types";
import { IBuilder } from "../interfaces/builder.interface";
import { IParser } from "../interfaces/parser.interface";
import { SourceObject } from "../types/source-object.type";
import { IOHelper } from "../helpers/io.helper";
import { Definitions } from "../types/definitions.type";
import { Utils } from "../utils";
import mergeJoiTpl from "../templates/joi.tpl";
import {
  JoiRefDecorator,
  JoiNumberDecorator,
  JoiNameDecorator,
  JoiValidDecorator,
  JoiRequiredDecorator,
  JoiStringDecorator,
  JoiArrayDecorator,
  JoiArrayRefDecorator,
  JoiBooleanDecorator,
  JoiDateDecorator,
  JoiAllowDecorator,
} from "../decorators/joi";
import { JoiComponent } from "../decorators/components/joi.component";
import { Decorator } from "../decorators/decorator";
import { OASEnum } from "../enums/oas.enum";
import { PerformanceHelper } from "../helpers/performance.helper";

export class JoiBuilder implements IBuilder {
  data: OpenAPIV3.Document;
  readonly outputDir: string;
  private CONTENT_TYPE = "application/json";
  protected fileNameExtension = ".ts";
  private performanceHelper = new PerformanceHelper();

  constructor(
    readonly parser: IParser,
    outputDir: string,
  ) {
    this.outputDir = `${outputDir}/joi`;
    this.parser.load();
    this.data = this.parser.export();
  }

  async dump(): Promise<number> {
    const { operations, schemas } = this.makeDefinitions();
    return await this.writeFile([...operations, ...schemas]);
  }

  protected makeDefinitions(): Definitions {
    Utils.consoleMessage({
      message: "Getting definitions...",
      underline: true,
    });
    const operationsList: Array<SourceObject> = [];
    const sourceObjectList: Array<SourceObject> = [];

    const sourceObjectIsPresent = (name: string) => {
      const index = sourceObjectList.findIndex((item) => {
        return this.getSourceObjectItemName(item) === name;
      });
      return index > -1 ? true : false;
    };

    Object.entries(this.getOperations(this.data)).forEach(
      ([operationName, ref]) => {
        const { schema, refName: schemaName } = ref;
        operationsList.push({
          [operationName]: {
            definitions: [schemaName],
            references: [schemaName],
          },
        });

        if (!sourceObjectIsPresent(schemaName)) {
          const sourceObject = this.makeSourceObject(schemaName, schema);
          const { references } = sourceObject[schemaName];
          if (references) {
            references.forEach((item) => {
              if (sourceObjectIsPresent(schemaName)) return;
              const schema = <OpenAPIV3.SchemaObject>(
                this.data.components.schemas[item]
              );
              sourceObjectList.push(this.makeSourceObject(item, schema));
            });
          }
          if (!sourceObjectIsPresent(schemaName))
            sourceObjectList.push(sourceObject);
        }
      },
    );

    return { operations: operationsList, schemas: sourceObjectList };
  }

  protected getOperations(data: OpenAPIV3.Document) {
    const operations: Record<
      string,
      {
        schema: any;
        refName: string;
      }
    > = {};

    Object.entries(data.paths).forEach(([urlPath, sc]) => {
      Object.entries(sc).forEach(([method, op]) => {
        const operation = <OpenAPIV3.OperationObject>op;

        const requestBody = <OpenAPIV3.RequestBodyObject>operation.requestBody;
        if (requestBody) {
          const content = requestBody.content[this.CONTENT_TYPE] || null;
          if (content) {
            const { $ref, ...schema } = <
              OpenAPIV3.ReferenceObject & OpenAPIV3.SchemaObject
            >content.schema;

            let refName = null;
            if ($ref || schema["items"]) {
              const ref = $ref || schema["items"]["$ref"];
              if (ref) {
                refName = ref.split("/").pop();
              }
            }
            const name = operation.operationId || method + urlPath + refName;
            operations[name] = {
              refName: refName || operation.operationId,
              schema: refName ? this.data.components.schemas[refName] : schema,
            };
          }
        }
      });
    });
    return operations;
  }

  protected makeSourceObject(
    name: string,
    schema: OpenAPIV3.SchemaObject,
  ): SourceObject {
    const joiItems: Array<JoiComponent> = [];
    const sourceObject: SourceObject = {
      [name]: {
        definitions: [],
        references: [],
      },
    };

    this.performanceHelper.setMark(name);
    Object.entries(schema.properties).forEach(([propName, def]) => {
      const required = schema.required?.indexOf(propName) >= 0;

      let joiComponent = new JoiComponent();

      joiComponent = new JoiNameDecorator(joiComponent, propName);

      const referenceName = this.getReferenceName(def);
      if (referenceName) {
        def[OASEnum.REF] = referenceName;
        sourceObject[name].references.push(referenceName);
      }

      joiComponent = this.getDecoratoryByType(joiComponent, def);
      if (required) joiComponent = new JoiRequiredDecorator(joiComponent);
      joiItems.push(joiComponent);
    });

    sourceObject[name].definitions = joiItems.map((item) => item.generate());
    this.performanceHelper.getMeasure(name);
    return sourceObject;
  }

  protected getReferenceName(
    def: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
  ): string {
    const ref = def["items"]
      ? def["items"][OASEnum.REF] || null
      : def[OASEnum.REF] || null;
    if (ref) return ref.split("/").pop();
    else return null;
  }

  protected isArrayOfReferences(
    def: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
  ): boolean {
    return def["type"] == OASEnum.ARRAY && def["items"][OASEnum.REF];
  }

  protected getDecoratoryByType(
    joiComponent: JoiComponent,
    def: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
  ): JoiComponent {
    const type = def["type"];
    if (type === OASEnum.ARRAY && def["items"]["type"]) {
      joiComponent = new JoiArrayDecorator(joiComponent, [
        this.getDecoratorByPrimitiveType(def["items"], new JoiComponent()),
      ]);
    } else if (type === OASEnum.ARRAY && def["items"][OASEnum.REF]) {
      joiComponent = new JoiArrayRefDecorator(joiComponent, def[OASEnum.REF]);
    } else if (type === OASEnum.STRING && def[OASEnum.ENUM]) {
      joiComponent = new JoiValidDecorator(
        this.getDecoratorByPrimitiveType(def, joiComponent),
        def["enum"],
      );
    } else if (def[OASEnum.REF]) {
      joiComponent = new JoiRefDecorator(joiComponent, def[OASEnum.REF]);
    } else {
      joiComponent = this.getDecoratorByPrimitiveType(def, joiComponent);
    }

    if (def["nullable"]) {
      joiComponent = new JoiAllowDecorator(joiComponent, [null]);
    }

    return joiComponent;
  }

  protected getDecoratorByPrimitiveType(
    def: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | string,
    joiComponent: JoiComponent,
  ): Decorator {
    const type = def["type"] || def;
    let decorator: Decorator;
    if (OASEnum.NUMBER.includes(type))
      decorator = new JoiNumberDecorator(joiComponent, {
        format: type,
        multiple: def["multiple"],
        min: def["minimum"],
        max: def["maximum"],
      });
    else if (type === OASEnum.BOOLEAN)
      decorator = new JoiBooleanDecorator(joiComponent);
    else if (OASEnum.DATE.includes(type))
      decorator = new JoiDateDecorator(joiComponent);
    else if (def["format"]) {
      if (def["nullable"]) {
        decorator = new JoiAllowDecorator(
          this.getDecoratorByPrimitiveType(def["format"], joiComponent),
          [null],
        );
      } else
        decorator = this.getDecoratorByPrimitiveType(
          def["format"],
          joiComponent,
        );
    } else
      decorator = new JoiStringDecorator(joiComponent, {
        format: def["format"] || type,
        min: def["minLength"],
        max: def["maxLength"],
        pattern: def["pattern"],
      });
    return decorator;
  }

  render(item: SourceObject): Array<string> {
    const itemName = this.getSourceObjectItemName(item);
    const { definitions, references } = item[itemName];

    const mergedTemplate = mergeJoiTpl({
      references: this.makeReferencesImportStatement(references),
      definitions,
    });

    return [this.makeSchemaFileName(itemName), mergedTemplate];
  }

  protected getSourceObjectItemName(item: SourceObject) {
    return Object.keys(item)[0];
  }

  protected makeReferencesImportStatement(items: Array<string>): Array<string> {
    const imports = [];
    items.forEach((item) => {
      const [name] = this.makeSchemaFileName(item).split(
        this.fileNameExtension,
      );
      imports.push(`import ${item} from "./${name}";`);
    });
    return imports;
  }

  protected makeSchemaFileName(value: string) {
    const name = Utils.toKebabCase(value);
    return `${name}.schema${this.fileNameExtension}`;
  }

  protected async writeFile(data: Array<SourceObject>): Promise<number> {
    Utils.consoleMessage({ message: "Writing files...", underline: true });
    const targetDirectory = this.outputDir;
    IOHelper.createFolder(targetDirectory);
    for (const item of data) {
      const [fileName, content] = this.render(item);
      this.performanceHelper.setMark(fileName);
      await IOHelper.writeFile({
        fileName,
        content,
        targetDirectory: this.outputDir,
      });
      this.performanceHelper.getMeasure(fileName);
    }
    return data.length;
  }
}
