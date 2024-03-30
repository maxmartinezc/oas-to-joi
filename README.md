# oas-to-joi

Create Joi schemas from your Open Api Specification file.

_**Bonus**_: Typescript Types files from the OAS schemas definitions too. 

## How to install
`npm install --save-dev oas-to-joi`

## How to use
### Command Line
```bash
oas-to-joi --oas-file path_to_oas_yaml_file --output path_to_output_directory
```

### Or creating an OasToJoi instance
```typescript
import OasToJoi from "oas-to-joi";
import path from "path";

  // pass the open api file
  const oasFilePath = path.resolve(`${__dirname}/my-oas-file.yaml`);
  const outputDirPath = path.resolve(`${__dirname}/my-output-folder`);

  // create OasToJoi object
  const oasToJoi = new OasToJoi({
    fileName: oasFilePath,
    outputDir: outputDirPath,
  });

  // get Joi schemas and validations
  oasToJoi.dumpJoiSchemas();
  // get Typescript types
  oasToJoi.dumpTypes();

```
## Validate data using Joi Schemas

```typescript
  import schema from "./output/joi/add-pet.schema";

  const validate = (data) => {
    const result = schema.validate(data, { abortEarly: false });
    console.log(result);
  };

  validate({ name: "Flanki" });
```

### Output
After dump the object you will get two folders with a set of files which represents the OAS file operations and schemas. For example:
```
└──── output
   ├── joi
   │   ├── add-pet.schema.ts
   │   ├── category.schema.ts
   │   ├── create-user.schema.ts
   │   ├── order.schema.ts
   │   ├── pet.schema.ts
   │   ├── place-order.schema.ts
   │   ├── tag.schema.ts
   │   ├── update-pet.schema.ts
   │   ├── update-user.schema.ts
   │   └── user.schema.ts
   └── types
       ├── address.type.ts
       ├── api-response.type.ts
       ├── category.type.ts
       ├── customer.type.ts
       ├── order.type.ts
       ├── pet.type.ts
       ├── tag.type.ts
       └── user.type.ts
```

## Limitation

- Only support YAML files.
- The YAML file have to be in utf8 encode.

- Doesn't support circular references, for example:
```typescript
// Pet schema file
const schema = Joi.object({
  id: Joi.number(),
  name: Joi.string().required(),
  tags: Joi.array().items(Tag),
});

// Tag schema file
const schema = Joi.object({
  id: Joi.number(),
  name: Joi.string().required(),
  others: Pet,
});
```

In this case, Tags schema has a reference to Pet and Pet also has a reference to Tag.
The workaround is put both together in the same file and modify the export default value.
