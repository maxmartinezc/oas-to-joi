import { BaseComponent } from "../components/base.component";
import { Decorator } from "../decorator";

type options = {
  format: "number" | "integer";
  min?: number;
  max?: number;
  multiple: number;
};

export class JoiNumberDecorator extends Decorator {
  constructor(
    component: BaseComponent,
    private options?: options,
  ) {
    super(component);
  }

  protected getNumberSubType() {
    switch (this.options?.format) {
      case "integer":
        return ".integer()";
      default:
        return "";
    }
  }

  protected applyAditionalOptions(): string {
    const { format: _, ...validations } = this.options;
    const options = Object.entries(validations).map(([key, value]) => {
      if (value) return `.${key}(${value})`;
    });
    return options.join("");
  }

  public generate(): string {
    const subType = this.getNumberSubType();
    const additionalValidations = this.applyAditionalOptions();
    return `${this.component.generate()}Joi.number()${subType}${additionalValidations}`;
  }
}
