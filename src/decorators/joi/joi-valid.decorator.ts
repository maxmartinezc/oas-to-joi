import { BaseComponent } from "../components/base.component";
import { Decorator } from "../decorator";

export class JoiValidDecorator extends Decorator {
  constructor(
    component: BaseComponent,
    private values: Array<string | number | boolean>,
  ) {
    super(component);
  }

  private getValidValues(): string {
    return this.values
      .map((item) => (typeof item === "string" ? `"${item}"` : item))
      .join("|");
  }

  public generate(): string {
    return `${this.component.generate()}.valid(${this.getValidValues()})`;
  }
}
