import { BaseComponent } from "../components/base.component";
import { Decorator } from "../decorator";

export class TypeScriptRefDecorator extends Decorator {
  constructor(
    component: BaseComponent,
    private name: string,
  ) {
    super(component);
  }
  public generate(): string {
    return `${this.component.generate()}${this.name}`;
  }
}
