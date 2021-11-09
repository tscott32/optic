import {
  factsToChangelog,
  OpenAPITraverser,
  OpenAPIV3,
} from "@useoptic/openapi-utilities";
import { ApiCheckDsl } from "./types";
import { ApiCheckService, DslConstructorInput } from "./api-check-service";

type OpenApiInput =
  | OpenAPIV3.Document
  | ((old: OpenAPIV3.Document) => OpenAPIV3.Document);

export function createTestDslFixture<DSL extends ApiCheckDsl, Context>(
  dslConstructor: (input: DslConstructorInput<Context>) => DSL
) {
  function compare(input: OpenApiInput) {
    const base = openApiInputToDocument(
      input,
      JSON.parse(JSON.stringify(emptyOpenApi))
    );
    return {
      to: (input: OpenApiInput) => {
        const next = openApiInputToDocument(
          input,
          JSON.parse(JSON.stringify(base))
        );

        return {
          withRule: async (rule: (dsl: DSL) => void, context: Context) => {
            const checker = new ApiCheckService<Context>();
            checker.useDsl<DSL>((input) => dslConstructor(input), rule);
            const results = await checker.runRules(base, next, context);

            const currentTraverser = new OpenAPITraverser();
            const nextTraverser = new OpenAPITraverser();

            await currentTraverser.traverse(base);
            const currentFacts = currentTraverser.accumulator.allFacts();
            await nextTraverser.traverse(next);
            const nextFacts = nextTraverser.accumulator.allFacts();
            return {
              results,
              base: base,
              next: next,
              changelog: factsToChangelog(currentFacts, nextFacts),
            };
          },
        };
      },
    };
  }

  return { compare };
}

function openApiInputToDocument(
  input: OpenApiInput,
  baseOpenApi: OpenAPIV3.Document
): OpenAPIV3.Document {
  if (typeof input === "function") {
    return input(baseOpenApi);
  } else {
    return input;
  }
}

const emptyOpenApi: OpenAPIV3.Document = {
  openapi: "3.0.1",
  paths: {},
  info: { version: "0.0.0", title: "Empty" },
};