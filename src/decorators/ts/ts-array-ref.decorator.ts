import { BaseComponent } from "../components/base.component";
import { Decorator } from "../decorator";

export class TypeScriptArrayRefDecorator extends Decorator {
  constructor(
    component: BaseComponent,
    private refName: string,
  ) {
    super(component);
  }
  public generate(): string {
    return `${this.component.generate()}Array<${this.refName}>`;
  }
}
