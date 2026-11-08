/**
 * JSON helpers that understand `{{template}}` placeholders.
 *
 * Node settings store JSON that may contain workflow templates, so plain
 * JSON.parse rejects valid user input. Validation masks the templates and uses
 * a small scanner that reports the exact offset, because modern V8 error
 * messages no longer include a position.
 */

const TEMPLATE_PATTERN = /\{\{[^{}]*\}\}/g;

export interface TemplateJsonError {
  message: string;
  line: number | null;
  column: number | null;
}

function templatePattern() {
  return new RegExp(TEMPLATE_PATTERN.source, "g");
}

/** True when `index` falls inside a JSON string literal. */
function isInsideString(text: string, index: number): boolean {
  let inString = false;
  let escaped = false;
  for (let i = 0; i < index; i++) {
    const char = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') inString = !inString;
  }
  return inString;
}

/**
 * Replaces every template with a same-length filler so the scanner sees valid
 * JSON while byte offsets keep pointing at the original text.
 */
export function maskTemplates(value: string): string {
  return value.replace(templatePattern(), (match) => "0" + " ".repeat(match.length - 1));
}

function positionToLineColumn(value: string, position: number): { line: number; column: number } {
  const clamped = Math.max(0, Math.min(position, value.length));
  const before = value.slice(0, clamped);
  const lastNewline = before.lastIndexOf("\n");
  return {
    line: before.split("\n").length,
    column: clamped - lastNewline,
  };
}

type Fail = (message: string, at?: number) => never;

function validateUnicodeEscape(text: string, index: number, fail: Fail): void {
  for (let offset = 1; offset <= 4; offset++) {
    if (!/[0-9a-fA-F]/.test(text[index + offset] ?? "")) {
      fail("Invalid unicode escape", index + offset);
    }
  }
}

class JsonSyntaxError extends Error {
  constructor(
    message: string,
    readonly position: number,
  ) {
    super(message);
    this.name = "JsonSyntaxError";
  }
}

const NUMBER_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/;

/** Validates JSON syntax and throws a JsonSyntaxError with the failing offset. */
function scanJson(text: string): void {
  let index = 0;

  const fail = (message: string, at = index): never => {
    throw new JsonSyntaxError(message, at);
  };

  const skipWhitespace = () => {
    while (index < text.length && /\s/.test(text[index])) index++;
  };

  const parseString = () => {
    index++; // opening quote
    while (index < text.length) {
      const char = text[index];
      if (char === '"') {
        index++;
        return;
      }
      if (char === "\\") {
        index++;
        if (index >= text.length) fail("Unterminated string");
        const escape = text[index];
        if (!'"\\/bfnrtu'.includes(escape)) fail(`Invalid escape sequence \\${escape}`);
        if (escape === "u") {
          validateUnicodeEscape(text, index, fail);
          index += 4;
        }
        index++;
        continue;
      }
      if (char.charCodeAt(0) < 0x20) fail("Control character in string");
      index++;
    }
    fail("Unterminated string");
  };

  const parseValue = () => {
    skipWhitespace();
    if (index >= text.length) fail("Unexpected end of input");

    const char = text[index];
    if (char === "{") return parseObject();
    if (char === "[") return parseArray();
    if (char === '"') return parseString();
    if (char === "-" || (char >= "0" && char <= "9")) {
      const match = NUMBER_PATTERN.exec(text.slice(index));
      if (!match || match[0].length === 0) throw new JsonSyntaxError("Invalid number", index);
      index += match[0].length;
      return;
    }
    if (text.startsWith("true", index)) return void (index += 4);
    if (text.startsWith("false", index)) return void (index += 5);
    if (text.startsWith("null", index)) return void (index += 4);

    fail(`Unexpected character ${JSON.stringify(char)}`);
  };

  const parseObject = () => {
    index++; // {
    skipWhitespace();
    if (text[index] === "}") {
      index++;
      return;
    }

    for (;;) {
      skipWhitespace();
      if (index >= text.length) fail("Unexpected end of input");
      if (text[index] !== '"') fail("Expected a property name in double quotes");
      parseString();
      skipWhitespace();
      if (text[index] !== ":") fail("Expected ':' after property name");
      index++;
      parseValue();
      skipWhitespace();
      if (text[index] === ",") {
        index++;
        continue;
      }
      if (text[index] === "}") {
        index++;
        return;
      }
      if (index >= text.length) fail("Unexpected end of input");
      fail("Expected ',' or '}'");
    }
  };

  const parseArray = () => {
    index++; // [
    skipWhitespace();
    if (text[index] === "]") {
      index++;
      return;
    }

    for (;;) {
      parseValue();
      skipWhitespace();
      if (text[index] === ",") {
        index++;
        continue;
      }
      if (text[index] === "]") {
        index++;
        return;
      }
      if (index >= text.length) fail("Unexpected end of input");
      fail("Expected ',' or ']'");
    }
  };

  parseValue();
  skipWhitespace();
  if (index < text.length) fail("Unexpected content after the JSON value");
}

/** Returns null when valid (or empty), otherwise the error with a location. */
export function validateTemplateJson(value: string): TemplateJsonError | null {
  if (!value.trim()) return null;

  try {
    scanJson(maskTemplates(value));
    return null;
  } catch (error) {
    if (error instanceof JsonSyntaxError) {
      const { line, column } = positionToLineColumn(value, error.position);
      return { message: error.message, line, column };
    }
    return { message: "Invalid JSON", line: null, column: null };
  }
}

export function formatTemplateJsonError(error: TemplateJsonError): string {
  if (error.line === null) return error.message;
  return `Line ${error.line}, column ${error.column}: ${error.message}`;
}

/**
 * Formats JSON that may contain templates. Templates are swapped for unique
 * tokens before parsing and restored afterwards, so they survive formatting
 * both inside strings and as raw values. Returns the input unchanged when it
 * cannot be parsed.
 */
export function formatTemplateJson(value: string): string {
  if (!value.trim()) return value;

  const tokens: { text: string; raw: boolean }[] = [];
  const tokenized = value.replace(templatePattern(), (match, offset: number) => {
    tokens.push({ text: match, raw: !isInsideString(value, offset) });
    return `__TPL_${tokens.length - 1}__`;
  });

  let prepared = tokenized;
  tokens.forEach((token, index) => {
    if (token.raw) prepared = prepared.split(`__TPL_${index}__`).join(`"__TPL_${index}__"`);
  });

  let formatted: string;
  try {
    formatted = JSON.stringify(JSON.parse(prepared), null, 2);
  } catch {
    return value;
  }

  // Raw tokens were quoted for parsing, so restore the quoted form first.
  tokens.forEach((token, index) => {
    if (token.raw) formatted = formatted.split(`"__TPL_${index}__"`).join(token.text);
  });
  tokens.forEach((token, index) => {
    if (!token.raw) formatted = formatted.split(`__TPL_${index}__`).join(token.text);
  });

  return formatted;
}
