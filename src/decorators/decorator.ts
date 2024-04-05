import { BaseComponent } from "./components/base.component";

export abstract class Decorator extends BaseComponent {
  constructor(protected component: BaseComponent) {
    super();
  }
  public abstract generate(): string;
}
