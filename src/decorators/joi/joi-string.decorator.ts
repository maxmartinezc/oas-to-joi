import { BaseComponent } from "../components/base.component";
import { Decorator } from "../decorator";

const REGEX_PATTERN_WORD = "pattern";
type options = {
  format:
    | "default"
    | "email"
    | "uuid"
    | "uri"
    | "hostname"
    | "ipv4"
    | "ipv6"
    | "byte";
  min?: number;
  max?: number;
  [REGEX_PATTERN_WORD]?: string;
};

export class JoiStringDecorator extends Decorator {
  constructor(
    component: BaseComponent,
    private options?: options,
  ) {
    super(component);
  }

  protected getStringSubType() {
    switch (this.options?.format) {
      case "email":
        return ".email()";
      case "uuid":
        return ".guid()";
      case "hostname":
        return ".hostname()";
      case "uri":
        return ".uri()";
      case "byte":
        return ".base64()";
      case "ipv4":
        return `.ip({ version: ["ipv4"], cidr: "optional" })`;
      case "ipv6":
        return `.ip({ version: ["ipv6"], cidr: "optional" })`;
      default:
        return "";
    }
  }

  protected parseRegexPattern(value: string): string {
    return `/${value}/`;
  }

  protected setAdditionalOptionValue(key: string, value: string | number) {
    return `${key === REGEX_PATTERN_WORD ? this.parseRegexPattern(value.toString()) : value}`;
  }

  protected applyAditionalOptions(): string {
    const { format: _, ...validations } = this.options;
    const options = Object.entries(validations).map(([key, value]) => {
      if (value) return `.${key}(${this.setAdditionalOptionValue(key, value)})`;
    });
    return options.join("");
  }

  public generate(): string {
    const subType = this.getStringSubType();
    const additionalValidations = this.applyAditionalOptions();
    return `${this.component.generate()}Joi.string()${subType}${additionalValidations}`;
  }
}
