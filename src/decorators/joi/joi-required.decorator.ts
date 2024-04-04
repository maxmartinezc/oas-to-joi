import { Decorator } from "../decorator";

export class JoiRequiredDecorator extends Decorator {
  public generate(): string {
    return this.component.generate() + ".required()";
  }
}
