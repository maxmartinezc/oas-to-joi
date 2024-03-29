import { JoiEnum } from "../enums/joi.enum";
import { ITemplate } from "../interfaces/template.interface";
import { SourceObject } from "../types/source-object.type";
import { Utils } from "../utils";

const WARNING_TEXT = `// This file is autogenerated by "oas-to-joi"`;
const FOOTER = "export default schema;";
const HEADER_JOI_IMPORT = "import Joi from 'joi';";

export class JoiTpl implements ITemplate {
  readonly outputDir = "joi";
  protected fileNameExtension = ".ts";
  protected body = "const schema = *;";
  protected propRegEx = /\{(.*?)\}/;
  protected refTypeRegEx = [
    /\*\*Array\<(.*?)\>\*\*/,
    /\*\*Joi\.array\(\)\.items\((.*?)\)\*\*/,
    /\*\*(.*?)\*\*/,
  ];

  protected requiredFieldRegEx = /(.*?)\[\*\]/;

  protected types = {
    primitives: {
      integer: JoiEnum.STRING,
      string: JoiEnum.STRING,
      boolean: JoiEnum.BOOLEAN,
    },
    arrays: {
      array: (value) =>
        `${JoiEnum.ARRAYS}.items(${this.types.primitives[value]})`,
      arrayRef: (value) =>
        `${JoiEnum.ARRAYS}.items(${Utils.capitalizeWord(value)})`,
    },
    enums: {
      enum: (value: Array<any>, type: string) =>
        `${this.types.primitives[type]};${value.join("|")}`,
    },
  };

  mapArrayType(): any {
    return this.types.arrays;
  }
  mapPrimitiveType(value: string): string {
    return this.types.primitives[value] || "Type Not Found";
  }
  mapEnumType(): any {
    return this.types.enums;
  }

  render(item: SourceObject): Array<string | string> {
    const typeName = Object.keys(item)[0];
    const { props } = item[typeName];
    const result = [];

    result.push(`${WARNING_TEXT}`);
    result.push(`${this.renderImports(props)}`);
    result.push(`${this.renderBody(props)}`);

    return [
      this.makeName(typeName),
      `${Utils.clean(result.join("\n"))}\n${FOOTER}\n`,
    ];
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
    return `\n${this.body.replace("*", this.makeJoiObject(props, spliter))}\n`;
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

  protected makeArrayValues(type, values): string {
    const stringDelimiter = type == this.types.primitives.string ? '"' : "";

    return values
      ? `.valid(${stringDelimiter}${values
          .split("|")
          .join(
            "" + stringDelimiter + "," + stringDelimiter + "",
          )}${stringDelimiter})`
      : "";
  }
}