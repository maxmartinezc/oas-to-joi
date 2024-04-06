import { BaseComponent } from "../components/base.component";
import { Decorator } from "../decorator";

type options = {
  format: "email" | "uuid" | "uri" | "hostname" | "ipv4" | "ipv6" | "default";
  maxLength?: number;
};

export class JoiStringDecorator extends Decorator {
  constructor(
    component: BaseComponent,
    private options?: options,
  ) {
    super(component);
  }

  protected getStringSubType() {
    switch (this.options.format) {
      case "email":
        return ".email()";
      case "uuid":
        return ".guid()";
      case "hostname":
        return ".hostname()";
      case "uri":
        return ".uri()";
      default:
        return "";
    }
  }

  public generate(): string {
    const subType = this.options ? this.getStringSubType() : "";
    return `${this.component.generate()}Joi.string()${subType}`;
  }
}
