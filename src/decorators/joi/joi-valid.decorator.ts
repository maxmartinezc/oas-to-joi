import { BaseComponent } from "../components/base.component";
import { Decorator } from "../decorator";

export class JoiValidDecorator extends Decorator {
  constructor(
    component: BaseComponent,
    private values: Array<string | number | boolean>,
  ) {
    super(component);
  }

  protected getValidValues(): string {
    return this.values
      .map((item) => (typeof item === "string" ? `"${item}"` : item))
      .toString();
  }

  public generate(): string {
    const validValues = this.getValidValues();
    return `${this.component.generate()}.valid(${validValues})`;
  }
}
