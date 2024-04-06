import { Decorator } from "../decorator";

export class TypeScriptDateDecorator extends Decorator {
  public generate(): string {
    return this.component.generate() + "Date";
  }
}
