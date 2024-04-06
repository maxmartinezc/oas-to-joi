import { Decorator } from "../decorator";

export class TypeScriptBooleanDecorator extends Decorator {
  public generate(): string {
    return this.component.generate() + "boolean";
  }
}
