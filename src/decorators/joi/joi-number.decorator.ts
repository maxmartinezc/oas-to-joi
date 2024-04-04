import { Decorator } from "../decorator";

export class JoiNumberDecorator extends Decorator {
  public generate(): string {
    return this.component.generate() + "Joi.number()";
  }
}
