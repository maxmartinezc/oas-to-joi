import { Decorator } from "../decorator";

export class TypeScriptStringDecorator extends Decorator {
  public generate(): string {
    return this.component.generate() + "string";
  }
}
