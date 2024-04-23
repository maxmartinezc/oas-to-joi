export class Utils {
  static toKebabCase(str: string) {
    return str
      .match(
        /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g,
      )
      .map((x) => x.toLowerCase())
      .join("-");
  }

  static consoleMessage(options: { message: string; underline?: boolean }) {
    const { message, underline } = options;
    if (underline) console.info(`\n${message}`, `\n${"-".repeat(30)}`);
    else console.info(message);
  }

  static consoleTitleMessage(message: string) {
    console.info(
      `\n${"=".repeat(30)}\n`,
      `${message}`,
      `\n${"=".repeat(30)}\n`,
    );
  }
}
