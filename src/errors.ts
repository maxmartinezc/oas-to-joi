export class OasToJoiError extends Error {
  constructor(message: string) {
    super();
    this.name = "OasToJoiError";
    this.message = message;
  }
}
