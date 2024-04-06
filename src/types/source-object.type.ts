export type SourceObject = Record<
  string,
  {
    definitions: Array<string>;
    references: Array<string>;
  }
>;
