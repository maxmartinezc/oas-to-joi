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
} from "../decorators/joi";
import { JoiComponent } from "../decorators/components/joi.component";

const HEADER_JOI_IMPORT = "import Joi from 'joi';";

export class JoiBuilder implements IBuilder {
  data: OpenAPIV3.Document;
  readonly outputDir: string;
  private CONTENT_TYPE = "application/json";
  protected fileNameExtension = ".ts";

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
    const sourceObjectList: Array<SourceObject> = [];

    Object.entries(this.getOperations(this.data)).forEach(([, ref]) => {
      const [operationName, schemaName] = ref;
      const schema = <OpenAPIV3.SchemaObject>(
        this.data.components.schemas[ref[1]]
      );
      operations.push(
        this.getOperationSchemaObjects(operationName, schemaName),
      );
      const joiComponent = this.makeJoiComponent(schemaName, schema);

      joiComponent[schemaName].references.forEach((item) => {
        const schema = <OpenAPIV3.SchemaObject>(
          this.data.components.schemas[item]
        );

        sourceObjectList.push(this.makeJoiComponent(item, schema));
      });

      sourceObjectList.push(joiComponent);
    });

    return { operations, schemas: sourceObjectList };
  }

  protected getSchemasReferences(
    parentDefs: Array<SourceObject>,
  ): Array<SourceObject> {
    const refJoiComponents: Array<SourceObject> = [];
    const refs = [
      ...new Set(
        parentDefs
          .map((item) => {
            return item[Object.keys(item)[0]].references;
          })
          .flat(),
      ),
    ];

    refs.forEach((item) => {
      const schema = <OpenAPIV3.SchemaObject>this.data.components.schemas[item];
      refJoiComponents.push(this.makeJoiComponent(item, schema));
    });

    return refJoiComponents;
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

  protected makeJoiComponent(
    name: string,
    schema: OpenAPIV3.SchemaObject,
  ): SourceObject {
    const joiItems: Array<JoiComponent> = [];
    const sourceObject: SourceObject = {
      [name]: {
        definition: "",
        references: [],
      },
    };

    Object.entries(schema.properties).forEach(([propName, def]) => {
      const required = schema.required?.indexOf(propName) >= 0;

      let joiComponent = new JoiComponent();

      joiComponent = new JoiNameDecorator(joiComponent, propName);

      if (def["$ref"]) {
        const refName = def["$ref"].split("/").pop();
        joiComponent = new JoiRefDecorator(joiComponent, refName);
        sourceObject[name].references.push(refName);
      } else if (this.isArrayOfReferences(def)) {
        const refName = def["items"]["$ref"].split("/").pop();
        joiComponent = new JoiArrayRefDecorator(joiComponent, refName);
        sourceObject[name].references.push(refName);
      } else {
        joiComponent = this.makeDecoratorByType(joiComponent, def);
        if (required) {
          joiComponent = new JoiRequiredDecorator(joiComponent);
        }
      }
      joiItems.push(joiComponent);
    });

    sourceObject[name].definition = this.printJoiObject(joiItems);

    return sourceObject;
  }

  protected printJoiObject(items: Array<JoiComponent>) {
    return `Joi.object({\n\u0020\u0020${items.map((item) => item.generate()).join(",\n\u0020\u0020")}\n})`;
  }

  protected isArrayOfReferences(
    def: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
  ): boolean {
    return def["type"] == "array" && def["items"]["$ref"];
  }

  // protected isStringType(type: string): boolean {
  //   return [
  //     "binary",
  //     "byte",
  //     "date",
  //     "date-time",
  //     "password",
  //     "string",
  //   ].includes(type);
  // }
  protected makeDecoratorByType(
    joiComponent: JoiComponent,
    def: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
  ): JoiComponent {
    if (def["type"] == "string")
      joiComponent = new JoiStringDecorator(joiComponent);
    else if (["number", "integer"].includes(def["type"]))
      joiComponent = new JoiNumberDecorator(joiComponent);
    else if (def["type"] == "boolean")
      joiComponent = new JoiBooleanDecorator(joiComponent);

    if (def["type"] === "array" && def["items"]["type"]) {
      // needs to support integer, boolean, and others types. Now has a StringDecorator by default
      joiComponent = new JoiArrayDecorator(joiComponent, [
        new JoiStringDecorator(new JoiComponent()),
      ]);
    } else if (def["type"] === "enum") {
      joiComponent = new JoiValidDecorator(joiComponent, def["enum"]);
    }
    return joiComponent;
  }

  protected getOperationSchemaObjects(
    operationName: string,
    schemaName: string,
  ): SourceObject {
    const defs: SourceObject = {
      [operationName]: {
        definition: schemaName,
        references: [schemaName],
      },
    };
    return defs;
  }

  render(item: SourceObject): Array<string> {
    const itemName = Object.keys(item)[0];
    const { definition: body, references } = item[itemName];

    const imports =
      (body.includes("Joi.") ? HEADER_JOI_IMPORT : "") +
      this.renderReferenceImports(references);

    const mergedTemplate = mergeJoiTpl({
      imports,
      body,
    });
    return [this.makeName(itemName), mergedTemplate];
  }

  protected renderReferenceImports(items: Array<string>): string {
    const imports = [];
    items.forEach((item) => {
      const [name] = this.makeName(item).split(this.fileNameExtension);
      imports.push(`import ${item} from "./${name}";`);
    });
    return imports.join("\n");
  }

  protected makeName(value: string) {
    const name = Utils.toKebabCase(value);
    return `${name}.schema${this.fileNameExtension}`;
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
