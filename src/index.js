#!/usr/bin/env node
import { getDMMF } from "@prisma/internals"
import * as fs from "fs"
import * as yargs from "yargs"
import {
  printNode,
  Project,
  ScriptKind,
  ts,
  VariableDeclarationKind,
} from "ts-morph"
import { logCompletion, logError, logInfo } from "./log"

const options = yargs
  .usage("Usage: -f <prisma-file-path>")
  .option("f", {
    alias: "file",
    describe: "Prisma file path",
    type: "string",
    demandOption: true,
  })
  .option("o", {
    alias: "output",
    describe: "Keystone file path",
    type: "string",
    demandOption: false,
    default: "generated.ts",
  })
  .option("enum", {
    alias: "generate-enums",
    describe: "Generate Enums inside the prisma schema",
    type: "flag",
    demandOption: false,
  }).argv

async function getParsedPrismaSchema(file) {
  if (fs.existsSync(file)) {
    const data = fs.readFileSync(file).toString()
    return (await getDMMF({ datamodel: data })).datamodel
  } else {
    logError("Prisma schema file doesn't exist!")
    return null
  }
}

function normalizeAllCapsToHumanReadable(allCapsString) {
  allCapsString = allCapsString.toLowerCase().replace(/_/gm, " ")
  allCapsString = allCapsString
    .split(" ")
    .map((block) => block.charAt(0).toUpperCase() + block.slice(1))
    .join(" ")
  return allCapsString
}

function getObjectForField(field, enums) {
  /** A prisma field has a structure of
   * {
   *         name: 'owner',
   *         kind: 'object',
   *         isList: false,
   *         isRequired: true,
   *         isUnique: false,
   *         isId: false,
   *         isReadOnly: false,
   *         type: 'Profile',
   *         hasDefaultValue: false,
   *         relationName: 'MediaToProfile',
   *         relationFromFields: [ 'profile' ],
   *         relationToFields: [ 'id' ],
   *         isGenerated: false,
   *         isUpdatedAt: false
   *  }
   *
   *  kind -> defines the type of field function to use ( checkbox , text ... )
   *  isRequired -> { validation: { isRequired: true }}
   *  isUnique -> isIndexed: 'unique'
   *  isIndexed -> isIndexed: true
   */

  let fieldFunctionType = "text"
  let innerObject = []
  const validations = [
    ts.factory.createPropertyAssignment(
      ts.factory.createIdentifier("isRequired"),
      field.isRequired ? ts.factory.createTrue() : ts.factory.createFalse()
    ),
  ]

  const dbs = [
    ts.factory.createPropertyAssignment(
      ts.factory.createIdentifier("isNullable"),
      field.isRequired ? ts.factory.createFalse() : ts.factory.createTrue()
    ),
  ]

  if (field.kind.toLowerCase() === "scalar") {
    switch (field.type.toLowerCase()) {
      case "string": {
        fieldFunctionType =
          field.name.toLowerCase() === "password" ? "password" : "text"
        if (fieldFunctionType === "text") {
          innerObject = [
            ts.factory.createPropertyAssignment(
              ts.factory.createIdentifier("isFilterable"),
              ts.factory.createTrue()
            ),
            ts.factory.createPropertyAssignment(
              ts.factory.createIdentifier("isOrderable"),
              ts.factory.createTrue()
            ),
          ]

          if (field.hasDefaultValue && typeof field.default === "string") {
            innerObject.push(
              ts.factory.createPropertyAssignment(
                ts.factory.createIdentifier("defaultValue"),
                ts.factory.createStringLiteral(field.default)
              )
            )
          }
        } else {
          validations.push(
            ts.factory.createPropertyAssignment(
              ts.factory.createIdentifier("rejectCommon"),
              ts.factory.createTrue()
            )
          )
        }

        break
      }
      case "boolean":
        fieldFunctionType = "checkbox"
        dbs.length = 0
        if (field.hasDefaultValue && typeof field.default === "boolean") {
          innerObject.push(
            ts.factory.createPropertyAssignment(
              ts.factory.createIdentifier("defaultValue"),
              field.default === true
                ? ts.factory.createTrue()
                : ts.factory.createFalse()
            )
          )
        }
        break
      case "datetime":
        fieldFunctionType = "timestamp"
        if (field.hasDefaultValue && typeof field.default === "object") {
          innerObject.push(
            ts.factory.createPropertyAssignment(
              ts.factory.createIdentifier("defaultValue"),
              ts.factory.createObjectLiteralExpression([
                ts.factory.createPropertyAssignment(
                  ts.factory.createIdentifier("kind"),
                  ts.factory.createStringLiteral(field.default.name)
                ),
              ])
            )
          )
        }

        dbs.push(
          ts.factory.createPropertyAssignment(
            ts.factory.createIdentifier("updatedAt"),
            field.isUpdatedAt
              ? ts.factory.createTrue()
              : ts.factory.createFalse()
          )
        )
        break
      case "int":
        fieldFunctionType = "integer"
        if (field.hasDefaultValue && typeof field.default === "number") {
          innerObject.push(
            ts.factory.createPropertyAssignment(
              ts.factory.createIdentifier("defaultValue"),
              ts.factory.createNumericLiteral(field.default)
            )
          )
        }

        break
      case "float":
        fieldFunctionType = "float"
        if (field.hasDefaultValue && typeof field.default === "number") {
          innerObject.push(
            ts.factory.createPropertyAssignment(
              ts.factory.createIdentifier("defaultValue"),
              ts.factory.createNumericLiteral(field.default)
            )
          )
        }

        break
      case "json":
        fieldFunctionType = "json"
        dbs.length = 0
        if (field.hasDefaultValue && typeof field.default === "string") {
          innerObject.push(
            ts.factory.createPropertyAssignment(
              ts.factory.createIdentifier("defaultValue"),
              ts.factory.createStringLiteral(field.default)
            )
          )
        }
        break
      case "jsonb":
        fieldFunctionType = "json"
        if (field.hasDefaultValue && typeof field.default === "string") {
          innerObject.push(
            ts.factory.createPropertyAssignment(
              ts.factory.createIdentifier("defaultValue"),
              ts.factory.createStringLiteral(field.default)
            )
          )
        }
        break
    }
  } else if (field.kind.toLowerCase() === "enum") {
    fieldFunctionType = "select"

    innerObject = [
      ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier("type"),
        ts.factory.createStringLiteral("enum")
      ),
      ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier("options"),
        ts.factory.createArrayLiteralExpression(
          enums
            .get(field.type)
            .map((option) =>
              ts.factory.createObjectLiteralExpression(
                [
                  ts.factory.createPropertyAssignment(
                    ts.factory.createIdentifier("label"),
                    ts.factory.createStringLiteral(
                      normalizeAllCapsToHumanReadable(option)
                    )
                  ),
                  ts.factory.createPropertyAssignment(
                    ts.factory.createIdentifier("value"),
                    ts.factory.createStringLiteral(option)
                  ),
                ],
                true
              )
            ),
          true
        )
      ),
    ]

    if (field.hasDefaultValue && typeof field.default === "string") {
      innerObject.push(
        ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier("defaultValue"),
          ts.factory.createStringLiteral(field.default)
        )
      )
    }
  } else if (field.kind.toLowerCase() === "object") {
    fieldFunctionType = "relationship"
    innerObject = [
      ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier("ref"),
        ts.factory.createStringLiteral(
          field.relationToFields[0] && field.relationToFields[0] !== "id"
            ? field.type + "." + field.relationToFields[0]
            : field.type
        )
      ),
      ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier("many"),
        field.isList ? ts.factory.createTrue() : ts.factory.createFalse()
      ),
    ]

    dbs.length = 0
    if (field.isList) {
      dbs.push(
        ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier("relationName"),
          ts.factory.createStringLiteral(field.relationName)
        )
      )
    }
  }

  if (field.isUnique) {
    innerObject.push(
      ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier("isIndexed"),
        ts.factory.createStringLiteral("unique")
      )
    )
  } else if (field.isId) {
    innerObject.push(
      ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier("isIndexed"),
        ts.factory.createTrue()
      )
    )
  }

  innerObject.push(
    ts.factory.createPropertyAssignment(
      ts.factory.createIdentifier("db"),
      ts.factory.createObjectLiteralExpression(dbs, true)
    )
  )

  if (
    fieldFunctionType !== "relationship" &&
    !(fieldFunctionType === "json" || fieldFunctionType === "checkbox")
  )
    innerObject.push(
      ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier("validation"),
        ts.factory.createObjectLiteralExpression(validations, true)
      )
    )

  return ts.factory.createPropertyAssignment(
    ts.factory.createIdentifier(field.name),
    ts.factory.createCallExpression(
      ts.factory.createIdentifier(fieldFunctionType),
      undefined,
      innerObject && innerObject.length > 0
        ? [ts.factory.createObjectLiteralExpression([...innerObject], true)]
        : undefined
    )
  )
}

async function writeTSFile(parsed) {
  if (!parsed) return

  logInfo("Started generating keystone6 schema ts")
  const project = new Project()
  const initial = [
    `
            // Like the "config" function we use in keystone.ts, we use functions
            // for putting in our config so we get useful errors. With typescript,
            // we get these even before code runs.
            import { config, list } from '@keystone-6/core';
        `,

    `
            // We're using some common fields in the starter. Check out https://keystonejs.com/docs/apis/fields#fields-api
            // for the full list of fields.

            import {
                // Scalar types
                checkbox,
                integer,
                json,
                float,
                password,
                select,
                text,
                timestamp,

                // Relationship type
                relationship,

                // Virtual type
                virtual,

                // File types
                file,
                image,
            } from '@keystone-6/core/fields';
        `,

    `
            // The document field is a more complicated field, so it's in its own package
            // Keystone aims to have all the base field types, but you can make your own
            // custom ones.
            import { document } from '@keystone-6/fields-document';
        `,

    `
            // We are using Typescript, and we want our types experience to be as strict as it can be.
            // By providing the Keystone generated \`Lists\` type to our lists object, we refine
            // our types to a stricter subset that is type-aware of other lists in our schema
            // that Typescript cannot easily infer.
            import { Lists } from '.keystone/types';
        `,
  ]

  const sourceFile = project.createSourceFile(
    options.output,
    (writer) => {
      initial.map((item) =>
        writer.write(item.replace(/^[\s]{12}/gm, "")).blankLine()
      )
    },
    { overwrite: true, scriptKind: ScriptKind.TS }
  )

  const listsVariable = sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    isExported: true,
    declarations: [
      {
        name: "lists",
        type: "Lists",
        initializer: (writer) => writer.write("{}"),
      },
    ],
  })

  const modelNameToFieldsMap = new Map()
  const enumNameToValues = new Map()

  parsed.models.forEach((item) =>
    modelNameToFieldsMap.set(item.name, item.fields)
  )
  parsed.enums.forEach((item) =>
    enumNameToValues.set(
      item.name,
      item.values.map((x) => x.name)
    )
  )

  const modelNames = modelNameToFieldsMap.keys()
  const listsOLE = listsVariable.getDeclarations()[0].getInitializer()

  if (options.enum) {
    for (let e of enumNameToValues.keys()) {
      const en = sourceFile.addEnum({ name: e })
      en.addMembers(
        enumNameToValues.get(e).map((item) => {
          return { name: item }
        })
      )
    }
    logCompletion("Generated Enums in the prisma schema")
  }

  for (let model of modelNames) {
    // Create the object keys using this
    listsOLE.addPropertyAssignment({
      name: model,
      initializer: (writer) => {
        writer.write(
          printNode(
            ts.factory.createCallExpression(
              ts.factory.createIdentifier("list"),
              undefined,
              [
                ts.factory.createObjectLiteralExpression(
                  [
                    ts.factory.createPropertyAssignment(
                      ts.factory.createIdentifier("fields"),
                      ts.factory.createObjectLiteralExpression(
                        modelNameToFieldsMap
                          .get(model)
                          .filter((f) => f.name !== "id")
                          .map((field) =>
                            getObjectForField(field, enumNameToValues)
                          ),
                        true
                      )
                    ),
                  ],
                  true
                ),
              ]
            )
          )
        )
      },
    })

    logCompletion(`Generated ${model} model`)
  }

  await sourceFile.save()
}

;(async () => await writeTSFile(await getParsedPrismaSchema(options.file)))()
