import { SourceObject } from "../types/source-object.type";

export interface ITemplate {
  readonly outputDir: string;
  mapArrayType(): object;
  mapPrimitiveType(value: string): string;
  mapEnumType(): string;
  render(item: SourceObject): Array<string | string>;
}
