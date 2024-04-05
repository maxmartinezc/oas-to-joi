import { BaseComponent } from "../components/base.component";
import { Decorator } from "../decorator";

export class JoiNameDecorator extends Decorator {
  constructor(
    component: BaseComponent,
    private name: string,
  ) {
    super(component);
  }
  public generate(): string {
    return `${this.name}: ${this.component.generate()}`;
  }
}
