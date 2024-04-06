import { Decorator } from "../decorator";

export class JoiDateDecorator extends Decorator {
  public generate(): string {
    return this.component.generate() + "Joi.date()";
  }
}
