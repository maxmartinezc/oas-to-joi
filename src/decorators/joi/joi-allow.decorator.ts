import { BaseComponent } from "../components/base.component";
import { Decorator } from "../decorator";

export class JoiAllowDecorator extends Decorator {
  constructor(
    component: BaseComponent,
    private values: Array<string | number | boolean | null>,
  ) {
    super(component);
  }

  protected getAllowValues(): string {
    return this.values
      .map((item) => (typeof item === "string" ? `"${item}"` : `${item}`))
      .toString();
  }

  public generate(): string {
    const allowValues = this.getAllowValues();
    return `${this.component.generate()}.allow(${allowValues})`;
  }
}
