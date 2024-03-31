#!/usr/bin/env node
const { cli } = require("../dist/lib")
const OAS_FILE_PARAMETER = "--oas-file";
const OUTPUT_DIR_PARAMETER = "--output";

const sourceFileParameterIndex = process.argv.indexOf(OAS_FILE_PARAMETER);
const outputDirIndex = process.argv.indexOf(OUTPUT_DIR_PARAMETER);

if (sourceFileParameterIndex > -1 && outputDirIndex > -1) {
  const sourceFileName = process.argv[sourceFileParameterIndex + 1];
  const outputDir = process.argv[outputDirIndex + 1];
  const oasToJoi = cli(sourceFileName, outputDir);
  oasToJoi.dumpJoiSchemas();
  console.log("Dumping Joi Schemas DONE!");
  oasToJoi.dumpTypes();
  console.log("Dumping TypeScript types DONE!");
} else {
  console.log(
     `Usage: oas-to-joi ${OAS_FILE_PARAMETER}path_and_file_name ${OUTPUT_DIR_PARAMETER}output_path`,
  );
}
