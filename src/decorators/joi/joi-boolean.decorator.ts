import { Decorator } from "../decorator";

export class JoiBooleanDecorator extends Decorator {
  public generate(): string {
    return this.component.generate() + "Joi.boolean()";
  }
}
