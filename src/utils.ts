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
    const defaultRepeatCharacterAmount = 30;
    const { message, underline } = options;

    const repeatCharacterAmount =
      message.length > defaultRepeatCharacterAmount
        ? message.length
        : defaultRepeatCharacterAmount;

    if (underline)
      console.info(`\n${message}`, `\n${"-".repeat(repeatCharacterAmount)}`);
    else console.info(message);
  }

  static consoleTitleMessage(message: string) {
    const marginCharacterAmount = 2;
    const defaultRepeatCharacterAmount = 30;
    const repeatCharacterAmount =
      (message.length > defaultRepeatCharacterAmount
        ? message.length
        : defaultRepeatCharacterAmount) + marginCharacterAmount;
    console.info(
      `\n${"=".repeat(repeatCharacterAmount)}\n`,
      `${message}`,
      `\n${"=".repeat(repeatCharacterAmount)}\n`,
    );
  }
}
