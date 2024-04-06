import { Decorator } from "../decorator";

export class TypeScriptNumberDecorator extends Decorator {
  public generate(): string {
    return this.component.generate() + "number";
  }
}
