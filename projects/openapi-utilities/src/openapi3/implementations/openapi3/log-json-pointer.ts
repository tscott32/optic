import { JsonSchemaSourcemap } from '@useoptic/openapi-io';
import { sourcemapReader } from './sourcemap-reader';
import chalk from 'chalk';

export function jsonPointerLogger(sourceMap: JsonSchemaSourcemap) {
  const reader = sourcemapReader(sourceMap);

  return {
    log: (pointer: string): string | undefined => {
      const lookupPosition = reader.findFileAndLines(pointer);
      if (lookupPosition) {
        const [start, end] = rangeFromLine(lookupPosition.startLine);
        const source = sourceMap.files.find(
          (file) => file.path === lookupPosition.filePath
        );
        if (!source)
          throw new Error(
            'could not render issue for file ' + lookupPosition.filePath
          );

        const previewLines = source.contents.split('\n').slice(start, end);
        return renderCodeFrame(
          start,
          end,
          previewLines,
          lookupPosition.filePath,
          lookupPosition.startLine
        );
      }
    },
  };
}

function rangeFromLine(
  line: number,
  before: number = 4,
  after: number = 3
): [number, number] {
  const start = line - before >= 0 ? line - before : 0;
  const end = line + after;

  return [start, end];
}

function renderCodeFrame(
  start: number,
  end: number,
  lines: string[],
  fileName: string,
  focus?: number
): string {
  const maxLineWidth = end.toString().length + 1;

  const smallestLeadingWhiteSpace = Math.min(
    ...lines.map((lineContents) => lineContents.search(/\S|$/) || 0)
  );

  const formattedLines = lines.map((lineContents, index) => {
    const lineNumber = start + index;
    lineNumber.toString().padStart(maxLineWidth, ' ');

    const line = lineContents.substring(smallestLeadingWhiteSpace);

    const isRed = typeof focus === 'number' && focus - 1 === lineNumber;

    return `${chalk.grey(lineNumber + 1 + ' |')} ${
      isRed ? chalk.bold.red(line) : line
    }`;
  });

  return `${formattedLines.join('\n')}\n${chalk.grey(fileName)}`;
}