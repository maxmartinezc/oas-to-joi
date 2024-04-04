export type SourceObject = Record<
  string,
  {
    props?: Array<string>;
    definition?: string;
    def?: string;
    refs?: Array<string>;
    references?: Array<string>;
  }
>;
