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
    const operations: Array<SourceObject> = [];
    const sourceObjectList: Array<SourceObject> = [];

    const sourceObjectIsPresent = (name: string) => {
      const index = sourceObjectList.findIndex((item) => {
        return this.getSourceObjectItemName(item) === name;
      });
      return index > -1 ? true : false;
    };

    Object.entries(this.getOperations(this.data)).forEach(([, ref]) => {
      const [operationName, schemaName] = ref;
      const schema = <OpenAPIV3.SchemaObject>(
        this.data.components.schemas[ref[1]]
      );
      operations.push(
        this.getOperationSchemaObjects(operationName, schemaName),
      );

      if (sourceObjectIsPresent(schemaName)) return;
      const sourceObject = this.makeSourceObject(schemaName, schema);

      sourceObject[schemaName].references.forEach((item) => {
        if (sourceObjectIsPresent(schemaName)) return;
        const schema = <OpenAPIV3.SchemaObject>(
          this.data.components.schemas[item]
        );

        sourceObjectList.push(this.makeSourceObject(item, schema));
      });

      sourceObjectList.push(sourceObject);
    });

    return { operations, schemas: sourceObjectList };
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

      if (def[OASEnum.REF]) {
        const refName = def[OASEnum.REF].split("/").pop();
        joiComponent = new JoiRefDecorator(joiComponent, refName);
        sourceObject[name].references.push(refName);
      } else if (this.isArrayOfReferences(def)) {
        const refName = def["items"][OASEnum.REF].split("/").pop();
        joiComponent = new JoiArrayRefDecorator(joiComponent, refName);
        sourceObject[name].references.push(refName);
      } else {
        joiComponent = this.getDecoratoryByType(joiComponent, def);
        if (required) {
          joiComponent = new JoiRequiredDecorator(joiComponent);
        }
      }
      joiItems.push(joiComponent);
    });

    sourceObject[name].definitions = joiItems.map((item) => item.generate());
    this.performanceHelper.getMeasure(name);
    return sourceObject;
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
    } else if (type === OASEnum.STRING && def[OASEnum.ENUM]) {
      joiComponent = new JoiValidDecorator(
        this.getDecoratorByPrimitiveType(def, joiComponent),
        def["enum"],
      );
    } else {
      joiComponent = this.getDecoratorByPrimitiveType(def, joiComponent);
    }
    return joiComponent;
  }

  protected getDecoratorByPrimitiveType(
    def: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | string,
    joiComponent: JoiComponent,
  ): Decorator {
    const type = def["type"] || def;

    if (OASEnum.STRING === type && OASEnum.OTHERS.includes(def["format"]))
      return new JoiStringDecorator(joiComponent, {
        format: def["format"],
      });
    else if (def["format"])
      return this.getDecoratorByPrimitiveType(def["format"], joiComponent);
    else if (OASEnum.NUMBER.includes(type))
      return new JoiNumberDecorator(joiComponent);
    else if (type === OASEnum.BOOLEAN)
      return new JoiBooleanDecorator(joiComponent);
    else if (OASEnum.DATE.includes(type))
      return new JoiDateDecorator(joiComponent);
    else return new JoiStringDecorator(joiComponent);
  }

  protected getOperationSchemaObjects(
    operationName: string,
    schemaName: string,
  ): SourceObject {
    const defs: SourceObject = {
      [operationName]: {
        definitions: [schemaName],
        references: [schemaName],
      },
    };
    return defs;
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
