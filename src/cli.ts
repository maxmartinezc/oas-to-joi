import { OasToJoi } from "./oas-to-joi";

export const cli = (sourceFileName, outputDir) =>
  new OasToJoi({ sourceFileName, outputDir });
