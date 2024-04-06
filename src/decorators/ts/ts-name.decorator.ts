import { BaseComponent } from "../components/base.component";
import { Decorator } from "../decorator";

export class TypeScriptNameDecorator extends Decorator {
  constructor(
    component: BaseComponent,
    private name: string,
    private isOptional: boolean,
  ) {
    super(component);
  }
  public generate(): string {
    return `${this.name}${this.isOptional ? "?" : ""}: ${this.component.generate()}`;
  }
}
