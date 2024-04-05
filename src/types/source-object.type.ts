export type SourceObject = Record<
  string,
  {
    props?: Array<string>;
    definitions?: Array<string>;
    def?: string;
    refs?: Array<string>;
    references?: Array<string>;
  }
>;
