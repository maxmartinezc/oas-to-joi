import { BaseComponent } from "../components/base.component";
import { Decorator } from "../decorator";

type options = {
  maxLength: number;
};
export class JoiStringDecorator extends Decorator {
  constructor(
    component: BaseComponent,
    private options?: options,
  ) {
    super(component);
  }
  public generate(): string {
    return this.component.generate() + "Joi.string()";
  }
}
