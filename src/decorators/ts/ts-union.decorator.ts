import { BaseComponent } from "../components/base.component";
import { Decorator } from "../decorator";

export class TypeScriptUnionDecorator extends Decorator {
  constructor(
    component: BaseComponent,
    private values: Array<string | number | boolean>,
  ) {
    super(component);
  }

  protected getValues(): string {
    return this.values
      .map((item) => (typeof item === "string" ? `"${item}"` : item))
      .join(" | ");
  }

  public generate(): string {
    const values = this.getValues();
    return `${this.component.generate()}${values}`;
  }
}
