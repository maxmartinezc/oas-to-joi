import { BaseComponent } from "../components/base.component";
import { Decorator } from "../decorator";

/**
 * TsArrayDecorator
 * Usage example:
 * tsComponent = new TypeScriptArrayDecorator(tsComponent, [
              new TypeScriptStringDecorator(new TsComponent()),
              new TypeScriptNumberDecorator(new TsComponent()),
            ]);
 */
export class TypeScriptArrayDecorator extends Decorator {
  constructor(
    component: BaseComponent,
    private itemsType: Array<Decorator>,
  ) {
    super(component);
  }

  protected getItemsType(): string {
    return this.itemsType.map((item) => item.generate()).join(",");
  }

  public generate(): string {
    const items = this.getItemsType();
    return `${this.component.generate()}Array<${items}>`;
  }
}
