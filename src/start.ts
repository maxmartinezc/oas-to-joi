import { OasToJoi } from "./oas-to-joi";

const start = () => {
  const oasFilePath = `${__dirname}/../openapi-example.yaml`;
  const outputDirPath = `${__dirname}/../dist/tmp`;
  const oasToJoi = new OasToJoi({
    sourceFileName: oasFilePath,
    outputDir: outputDirPath,
  });
  // can be extra params for dump action? names? conventions?
  oasToJoi.dumpJoiSchemas();
  oasToJoi.dumpTypes();
};

start();
