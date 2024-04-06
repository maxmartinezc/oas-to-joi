import { OpenAPIV3 } from "openapi-types";
import { IBuilder } from "../interfaces/builder.interface";
import { IParser } from "../interfaces/parser.interface";
import { SourceObject } from "../types/source-object.type";
import { IOHelper } from "../helpers/io.helper";
import { Definitions } from "../types/definitions.type";
import { Utils } from "../utils";
import mergeTypeScriptTpl from "../templates/ts.tpl";

import {
  TypeScriptNameDecorator,
  TypeScriptStringDecorator,
  TypeScriptNumberDecorator,
  TypeScriptBooleanDecorator,
  TypeScriptArrayDecorator,
  TypeScriptArrayRefDecorator,
  TypeScriptRefDecorator,
  TypeScriptUnionDecorator,
  TypeScriptDateDecorator,
} from "../decorators/ts";
import { TypeScriptComponent } from "../decorators/components/ts.component";
import { Decorator } from "../decorators/decorator";
import { OASEnum } from "../enums/oas.enum";

export class TypeScriptBuilder implements IBuilder {
  data: OpenAPIV3.Document;
  readonly outputDir: string;
  protected fileNameExtension = ".ts";

  constructor(
    readonly parser: IParser,
    outputDir: string,
  ) {
    this.outputDir = `${outputDir}/types`;
    this.parser.load();
    this.data = this.parser.export();
  }

  dump(): void {
    const { schemas } = this.makeDefinitions();
    this.writeFile(schemas);
  }

  protected makeDefinitions(): Definitions {
    const sourceObjectList: Array<SourceObject> = [];

    Object.entries(this.data.components.schemas).forEach(
      ([schemaName, defs]) => {
        const schemaDefs = <OpenAPIV3.SchemaObject>defs;
        const sourceObject = this.makeSourceObject(schemaName, schemaDefs);

        sourceObject[schemaName].references.forEach((item) => {
          const schema = <OpenAPIV3.SchemaObject>(
            this.data.components.schemas[item]
          );

          sourceObjectList.push(this.makeSourceObject(item, schema));
        });

        sourceObjectList.push(sourceObject);
      },
    );

    return { operations: [], schemas: sourceObjectList };
  }

  protected getSchemasReferences(
    parentDefs: Array<SourceObject>,
  ): Array<SourceObject> {
    const refSourceComponents: Array<SourceObject> = [];
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
      refSourceComponents.push(this.makeSourceObject(item, schema));
    });

    return refSourceComponents;
  }

  protected makeSourceObject(
    name: string,
    schema: OpenAPIV3.SchemaObject,
  ): SourceObject {
    const joiItems: Array<TypeScriptComponent> = [];
    const sourceObject: SourceObject = {
      [name]: {
        definitions: [],
        references: [],
      },
    };

    Object.entries(schema.properties).forEach(([propName, def]) => {
      const isOptional = schema.required?.indexOf(propName) == -1;

      let tsComponent = new TypeScriptComponent();

      tsComponent = new TypeScriptNameDecorator(
        tsComponent,
        propName,
        isOptional,
      );

      if (def[OASEnum.REF]) {
        const refName = def[OASEnum.REF].split("/").pop();
        tsComponent = new TypeScriptRefDecorator(tsComponent, refName);
        sourceObject[name].references.push(refName);
      } else if (this.isArrayOfReferences(def)) {
        const refName = def["items"][OASEnum.REF].split("/").pop();
        tsComponent = new TypeScriptArrayRefDecorator(tsComponent, refName);
        sourceObject[name].references.push(refName);
      } else {
        tsComponent = this.getDecoratoryByType(tsComponent, def);
      }
      joiItems.push(tsComponent);
    });

    sourceObject[name].definitions = joiItems.map((item) => item.generate());

    return sourceObject;
  }

  protected isArrayOfReferences(
    def: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
  ): boolean {
    return def["type"] == OASEnum.ARRAY && def["items"][OASEnum.REF];
  }

  protected getDecoratoryByType(
    tsComponent: TypeScriptComponent,
    def: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
  ): TypeScriptComponent {
    const type = def["type"];
    if (type === OASEnum.ARRAY && def["items"]["type"]) {
      tsComponent = new TypeScriptArrayDecorator(tsComponent, [
        this.getDecoratorByPrimitiveType(
          def["items"],
          new TypeScriptComponent(),
        ),
      ]);
    } else if (type === OASEnum.STRING && def[OASEnum.ENUM]) {
      tsComponent = new TypeScriptUnionDecorator(
        tsComponent,
        def[OASEnum.ENUM],
      );
    } else {
      tsComponent = this.getDecoratorByPrimitiveType(def, tsComponent);
    }
    return tsComponent;
  }

  protected getDecoratorByPrimitiveType(
    def: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | string,
    tsComponent: TypeScriptComponent,
  ): Decorator {
    const type = def["type"] || def;

    if (def["format"])
      return this.getDecoratorByPrimitiveType(def["format"], tsComponent);
    else if (OASEnum.NUMBER.includes(type))
      return new TypeScriptNumberDecorator(tsComponent);
    else if (type == OASEnum.BOOLEAN)
      return new TypeScriptBooleanDecorator(tsComponent);
    else if (OASEnum.DATE.includes(type))
      return new TypeScriptDateDecorator(tsComponent);
    else return new TypeScriptStringDecorator(tsComponent);
  }

  render(item: SourceObject): Array<string> {
    const name = Object.keys(item)[0];
    const { definitions, references } = item[name];

    const mergedTemplate = mergeTypeScriptTpl({
      name,
      references: this.makeReferencesImportStatement(references),
      definitions,
    });

    return [this.makeFileName(name), mergedTemplate];
  }

  protected makeReferencesImportStatement(items: Array<string>): Array<string> {
    const imports = [];
    items.forEach((item) => {
      const [name] = this.makeFileName(item).split(this.fileNameExtension);
      imports.push(`import { ${item} } from "./${name}";`);
    });
    return imports;
  }

  protected makeFileName(value: string) {
    const name = Utils.toKebabCase(value);
    return `${name}.type${this.fileNameExtension}`;
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
