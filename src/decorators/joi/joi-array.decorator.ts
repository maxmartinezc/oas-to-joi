import { BaseComponent } from "../components/base.component";
import { Decorator } from "../decorator";

/**
 *  joiComponent = new JoiArrayDecorator(joiComponent, [
              new JoiStringDecorator(new JoiComponent()),
              new JoiNumberDecorator(new JoiComponent()),
            ]);
 */
export class JoiArrayDecorator extends Decorator {
  constructor(
    component: BaseComponent,
    private itemsType: Array<Decorator>,
  ) {
    super(component);
  }

  private getItemsType(): string {
    return this.itemsType.map((item) => item.generate()).join(",");
  }
  public generate(): string {
    return `${this.component.generate()}Joi.array().items(${this.getItemsType()})`;
  }
}
