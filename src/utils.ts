export class Utils {
  static capitalizeWord(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  static toKebabCase(str: string) {
    return str
      .match(
        /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g,
      )
      .map((x) => x.toLowerCase())
      .join("-");
  }

  static matches(dirty: string, regEx: RegExp): string {
    const [, matches] = dirty.match(regEx) || [""];
    return matches;
  }

  static clean(value: string, regEx: RegExp = /\*\*/g): string {
    return value.replace(regEx, "");
  }
}
