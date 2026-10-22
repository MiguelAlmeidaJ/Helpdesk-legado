type SqlQuery = {
  sql: string;
  args: readonly unknown[];
  argTypes: readonly unknown[];
};

type QueryableAdapter = {
  queryRaw(query: SqlQuery): Promise<unknown>;
  executeRaw(query: SqlQuery): Promise<unknown>;
  startTransaction?: (...args: unknown[]) => Promise<QueryableAdapter>;
};

function isWordCharacter(value: string | undefined): boolean {
  return value !== undefined && /[A-Za-z0-9_]/.test(value);
}

function findClosingParenthesis(sql: string, opening: number): number {
  let depth = 0;
  let quote: "'" | '"' | null = null;

  for (let index = opening; index < sql.length; index += 1) {
    const value = sql[index];

    if (quote) {
      if (value === quote) {
        if (sql[index + 1] === quote) {
          index += 1;
        } else {
          quote = null;
        }
      } else if (value === '\\') {
        index += 1;
      }
      continue;
    }

    if (value === "'" || value === '"') {
      quote = value;
    } else if (value === '(') {
      depth += 1;
    } else if (value === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function splitArguments(value: string): string[] {
  const result: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: "'" | '"' | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const current = value[index];
    if (quote) {
      if (current === quote) {
        if (value[index + 1] === quote) index += 1;
        else quote = null;
      } else if (current === '\\') index += 1;
      continue;
    }
    if (current === "'" || current === '"') quote = current;
    else if (current === '(') depth += 1;
    else if (current === ')') depth -= 1;
    else if (current === ',' && depth === 0) {
      result.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  result.push(value.slice(start).trim());
  return result;
}

function rewriteFunctionCalls(
  input: string,
  functionName: string,
  rewrite: (argumentsValue: string) => string | null,
): string {
  const upper = input.toUpperCase();
  const expected = functionName.toUpperCase();
  let output = '';
  let cursor = 0;

  while (cursor < input.length) {
    const found = upper.indexOf(expected, cursor);
    if (found < 0) {
      output += input.slice(cursor);
      break;
    }
    const before = input[found - 1];
    let opening = found + expected.length;
    while (/\s/.test(input[opening] ?? '')) opening += 1;
    if (isWordCharacter(before) || input[opening] !== '(') {
      output += input.slice(cursor, found + expected.length);
      cursor = found + expected.length;
      continue;
    }
    const closing = findClosingParenthesis(input, opening);
    if (closing < 0) {
      output += input.slice(cursor);
      break;
    }
    const replacement = rewrite(input.slice(opening + 1, closing));
    output += input.slice(cursor, found);
    output += replacement ?? input.slice(found, closing + 1);
    cursor = closing + 1;
  }
  return output;
}

function replaceIdentifiersAndParameters(input: string): string {
  let output = '';
  let parameter = 0;

  for (let index = 0; index < input.length; index += 1) {
    const value = input[index];
    if (value === "'" || value === '"') {
      const quote = value;
      const start = index;
      for (index += 1; index < input.length; index += 1) {
        if (input[index] === quote) {
          if (input[index + 1] === quote) index += 1;
          else break;
        } else if (input[index] === '\\') index += 1;
      }
      output += input.slice(start, index + 1);
      continue;
    }
    if (value === '`') {
      let identifier = '';
      for (index += 1; index < input.length; index += 1) {
        if (input[index] === '`') {
          if (input[index + 1] === '`') {
            identifier += '`';
            index += 1;
            continue;
          }
          break;
        }
        identifier += input[index];
      }
      output += `[${identifier.replaceAll(']', ']]')}]`;
      continue;
    }
    if (value === '?') {
      parameter += 1;
      output += `@P${parameter}`;
      continue;
    }
    output += value;
  }
  return output;
}

function sqlString(value: string): string | null {
  const match = value.trim().match(/^'(.*)'$/s);
  return match ? match[1]?.replaceAll("''", "'") ?? '' : null;
}

function rewriteFunctions(input: string): string {
  let sql = input;
  sql = rewriteFunctionCalls(sql, 'UTC_TIMESTAMP', () => 'SYSUTCDATETIME()');
  sql = rewriteFunctionCalls(sql, 'NOW', () => 'SYSDATETIME()');
  sql = rewriteFunctionCalls(sql, 'CURDATE', () => 'CONVERT(date, SYSDATETIME())');
  sql = rewriteFunctionCalls(sql, 'DATABASE', () => 'DB_NAME()');
  sql = rewriteFunctionCalls(sql, 'LAST_INSERT_ID', () => 'CONVERT(bigint, @@IDENTITY)');
  sql = rewriteFunctionCalls(sql, 'LAST_DAY', (value) => `EOMONTH(${value})`);
  sql = rewriteFunctionCalls(sql, 'WEEKDAY', (value) =>
    `(DATEDIFF(day, CONVERT(date, '19000101', 112), CONVERT(date, ${value})) % 7)`,
  );
  sql = rewriteFunctionCalls(sql, 'DATE', (value) => `CONVERT(date, ${value})`);
  sql = rewriteFunctionCalls(sql, 'TIMESTAMPDIFF', (value) => {
    const args = splitArguments(value);
    return args.length === 3 ? `DATEDIFF(${args[0]}, ${args[1]}, ${args[2]})` : null;
  });
  sql = rewriteFunctionCalls(sql, 'TIMESTAMPADD', (value) => {
    const args = splitArguments(value);
    return args.length === 3 ? `DATEADD(${args[0]}, ${args[1]}, ${args[2]})` : null;
  });
  for (const name of ['DATE_ADD', 'DATE_SUB'] as const) {
    sql = rewriteFunctionCalls(sql, name, (value) => {
      const args = splitArguments(value);
      const interval = args[1]?.match(/^INTERVAL\s+(.+?)\s+(DAY|HOUR|MINUTE|SECOND|MONTH|YEAR)$/i);
      if (args.length !== 2 || !interval) return null;
      const amount = name === 'DATE_SUB' ? `-(${interval[1]})` : interval[1];
      return `DATEADD(${interval[2]}, ${amount}, ${args[0]})`;
    });
  }
  sql = rewriteFunctionCalls(sql, 'CONVERT_TZ', (value) => {
    const args = splitArguments(value);
    if (args.length !== 3) return null;
    const from = sqlString(args[1]);
    const to = sqlString(args[2]);
    const offset = (zone: string | null) => {
      const match = zone?.match(/^([+-])(\d{2}):(\d{2})$/);
      return match ? (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) : null;
    };
    const fromMinutes = offset(from);
    const toMinutes = offset(to);
    return fromMinutes === null || toMinutes === null
      ? null
      : `DATEADD(minute, ${toMinutes - fromMinutes}, ${args[0]})`;
  });
  sql = rewriteFunctionCalls(sql, 'DATE_FORMAT', (value) => {
    const args = splitArguments(value);
    const format = sqlString(args[1] ?? '');
    if (args.length !== 2 || !format) return null;
    if (format === '%Y-%m-%d') return `CONVERT(char(10), ${args[0]}, 23)`;
    if (format === '%Y-%m-%d %H:%i:%s') return `CONVERT(char(19), ${args[0]}, 120)`;
    if (format === '%Y-%m-%dT%H:%i:%s') return `CONVERT(char(19), ${args[0]}, 126)`;
    if (format === '%H:%i') return `LEFT(CONVERT(char(8), ${args[0]}, 108), 5)`;
    if (format === '%m-%d') return `RIGHT(CONVERT(char(10), ${args[0]}, 23), 5)`;
    return null;
  });
  sql = rewriteFunctionCalls(sql, 'FIELD', (value) => {
    const args = splitArguments(value);
    if (args.length < 2) return null;
    const cases = args.slice(1).map((candidate, index) => `WHEN ${candidate} THEN ${index + 1}`).join(' ');
    return `(CASE ${args[0]} ${cases} ELSE 0 END)`;
  });
  sql = rewriteFunctionCalls(sql, 'CAST', (value) => {
    const match = value.match(/^(.*)\s+AS\s+UNSIGNED$/is);
    return match ? `TRY_CONVERT(bigint, ${match[1]})` : null;
  });
  return sql
    .replace(/\bUTC_TIMESTAMP\b(?!\s*\()/gi, 'SYSUTCDATETIME()')
    .replace(/\bCURRENT_DATE\b(?!\s*\()/gi, 'CONVERT(date, SYSDATETIME())');
}

function depthAt(input: string, end: number): number {
  let depth = 0;
  let quote: "'" | '"' | '[' | null = null;
  for (let index = 0; index < end; index += 1) {
    const value = input[index];
    if (quote) {
      const closing = quote === '[' ? ']' : quote;
      if (value === closing) {
        if (input[index + 1] === closing) index += 1;
        else quote = null;
      }
      continue;
    }
    if (value === "'" || value === '"' || value === '[') quote = value;
    else if (value === '(') depth += 1;
    else if (value === ')') depth -= 1;
  }
  return depth;
}

function addTopAtMatchingStatement(input: string, limitIndex: number, amount: string): string | null {
  const targetDepth = depthAt(input, limitIndex);
  const tokens = /\b(SELECT|UPDATE|DELETE)\b/gi;
  let selected: RegExpExecArray | null = null;
  for (let match = tokens.exec(input); match && match.index < limitIndex; match = tokens.exec(input)) {
    if (depthAt(input, match.index) === targetDepth) selected = match;
  }
  if (!selected) return null;
  const keyword = selected[1]?.toUpperCase();
  let insertion = selected.index + selected[0].length;
  if (keyword === 'SELECT') {
    const after = input.slice(insertion);
    const distinct = after.match(/^\s+DISTINCT\b/i);
    if (distinct) insertion += distinct[0].length;
  }
  return `${input.slice(0, insertion)} TOP (${amount})${input.slice(insertion)}`;
}

function rewriteLimits(input: string): string {
  let sql = input;
  const expression = /\bLIMIT\s+(@P\d+|\d+)(?:\s+OFFSET\s+(@P\d+|\d+))?/gi;
  let matches = [...sql.matchAll(expression)];
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index];
    if (match.index === undefined) continue;
    const limit = match[1];
    const offset = match[2];
    if (offset) {
      const before = sql.slice(0, match.index);
      const currentDepth = depthAt(sql, match.index);
      const orderMatches = [...before.matchAll(/\bORDER\s+BY\b/gi)];
      const hasOrder = orderMatches.some((candidate) =>
        candidate.index !== undefined && depthAt(sql, candidate.index) === currentDepth,
      );
      const replacement = `${hasOrder ? '' : 'ORDER BY (SELECT NULL) '}OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
      sql = `${sql.slice(0, match.index)}${replacement}${sql.slice(match.index + match[0].length)}`;
      continue;
    }
    const withoutLimit = `${sql.slice(0, match.index)}${sql.slice(match.index + match[0].length)}`;
    sql = addTopAtMatchingStatement(withoutLimit, match.index, limit) ?? withoutLimit;
    matches = [...sql.matchAll(expression)];
  }
  return sql;
}

export function translateMysqlSqlToSqlServer(input: string): string {
  if (/^\s*CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\b/i.test(input)) {
    // The migrated SQL Server schema is authoritative. Legacy bootstrap DDL is
    // MySQL-only and is intentionally a no-op when the target table exists.
    return 'SELECT 0 AS compatibility_noop WHERE 1 = 0';
  }

  let sql = replaceIdentifiersAndParameters(input);
  sql = sql.replace(/\s+FOR\s+UPDATE\b/gi, '');
  sql = rewriteFunctions(sql);
  sql = rewriteLimits(sql);
  sql = sql.replace(
    /([\[\]A-Za-z0-9_.]+)\s*<=>\s*(@P\d+)/g,
    '(($1 = $2) OR ($1 IS NULL AND $2 IS NULL))',
  );
  return sql;
}

function wrapQueryableAdapter<T extends QueryableAdapter>(adapter: T): T {
  return new Proxy(adapter, {
    get(target, property, receiver) {
      if (property === 'queryRaw' || property === 'executeRaw') {
        return (query: SqlQuery) => target[property]({
          ...query,
          sql: translateMysqlSqlToSqlServer(query.sql),
        });
      }
      if (property === 'startTransaction' && target.startTransaction) {
        return async (...args: unknown[]) =>
          wrapQueryableAdapter(await target.startTransaction!(...args));
      }
      const value = Reflect.get(target, property, receiver) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export function enableMysqlCompatibility<T extends object>(factory: T): T {
  const mutable = factory as unknown as {
    connect: (...args: unknown[]) => Promise<QueryableAdapter>;
  };
  const connect = mutable.connect.bind(factory);
  mutable.connect = async (...args: unknown[]) =>
    wrapQueryableAdapter(await connect(...args));
  return factory;
}
