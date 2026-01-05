import { exec } from 'child_process';
import { promises as fs } from 'fs';
import minimatch from 'minimatch';
import osPath from 'path';
import { PluginContext } from 'rollup';
import { promisify } from 'util';
import { HmrContext, Plugin } from 'vite';

const execAsync = promisify(exec);

interface LaravelDataTypesOptions {
  patterns?: string[];
  command?: string;
  path?: string;
  extraArgs?: string[];
  /**
   * If true, automatically replaces verbose paginator types with
   * a generic LengthAwarePaginator<T> type.
   * Requires the 'path' option to be set.
   * @default true
   */
  refactorPaginators?: boolean;
}

let context: PluginContext;

/**
 * Generates enum objects from PHP enum definitions.
 */
const generateEnums = async (
  pluginContext: PluginContext,
) => {
  const enumsDir = osPath.join('app', 'Enums');
  const runtimeEnumsFilePath = osPath.join('resources', 'js', 'types', 'enums.ts');
  try {
    // Read all PHP enum files
    const enumFiles = await fs.readdir(enumsDir);
    const enums: Record<string, Record<string, string>> = {};

    for (const file of enumFiles) {
      if (!file.endsWith('.php')) continue;

      const filePath = osPath.join(enumsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');

      // Extract enum name and cases
      const enumNameMatch = content.match(/enum (\w+): string/);
      if (!enumNameMatch) continue;

      const enumName = enumNameMatch[1];
      const enumObj: Record<string, string> = {};

      // Extract case definitions like: case CaseName = 'value';
      const caseRegex = /case (\w+)\s*=\s*['"]([^'"]+)['"]/g;
      let caseMatch;
      while ((caseMatch = caseRegex.exec(content)) !== null) {
        enumObj[caseMatch[1]] = caseMatch[2];
      }

      if (Object.keys(enumObj).length > 0) {
        enums[enumName] = enumObj;
      }
    }

    // Generate the runtime enums file
    const runtimeEnumsContent = `/**
 * Runtime enum objects that mirror the PHP enums.
 * These are used in JavaScript code where TypeScript enums don't exist at runtime.
 * This file is auto-generated. Do not edit manually.
 */
export const Enums = {
${Object.entries(enums)
  .map(([enumName, enumObj]) => {
    const entries = Object.entries(enumObj)
      .map(([key, value]) => `        ${key}: '${value}'`)
      .join(',\n');
    return `    ${enumName}: {\n${entries}\n    } as const`;
  })
  .join(',\n\n')}
} as const;

declare global {
  namespace EnumType {
${Object.entries(enums)
      .map(([enumName]) => {
        return `    type ${enumName} = typeof Enums.${enumName}[keyof typeof Enums.${enumName}]; `;
      })
      .join('\n\n')}
  }
}

export type EnumsTypeName = keyof typeof Enums;
export type EnumsType = typeof Enums[EnumsTypeName];

export interface EnumOption<T extends EnumsType> {
  value: T[keyof T];
  label: string;
}

/**
 * Helper function to get enum labels from values
 */
export function getEnumLabel<T extends EnumsType>(enumObj: T, value: T[keyof T]): string {
    const entry = Object.entries(enumObj).find(([, val]) => val === value);
    return entry ? entry[0].replace(/([A-Z])/g, ' $1').trim() : String(value);
};

export function enumToOptions<T extends EnumsType>(enumObject: T): EnumOption<T>[] {
  return Object.entries(enumObject)
      .filter(([key]) => isNaN(Number(key))) // Filter out numeric keys for numeric enums
      .map(([key, value]) => ({
          value: value as T[keyof T],
          label: key.replace(/([A-Z])/g, ' $1').trim(),
      }));
}
${Object.keys(enums)
  .map(enumName => `export const get${enumName}Label = (value: EnumType.${enumName}): string => getEnumLabel(Enums.${enumName}, value);`)
  .join('\n')}
`;

    await fs.writeFile(runtimeEnumsFilePath, runtimeEnumsContent, "utf-8");
    pluginContext.info(
      `[laravel-data] Generated enums in ${runtimeEnumsFilePath}.`,
    );
  } catch (error) {
    pluginContext.error(
      `[laravel-data] Failed to generate runtime enums:\n${error}`,
    );
  }
};

/**
 * Refactors the verbose Laravel paginator type in the generated file.
 */
const refactorPaginatorInFile = async (
  pluginContext: PluginContext,
) => {
  const filePath = osPath.join('resources', 'js', 'types', 'generated.d.ts');

  try {
    const fullPath = osPath.resolve(filePath);
    const originalContent = await fs.readFile(fullPath, "utf-8");

    // Replace verbose paginator type
    const paginatorRegex =
      /\{data:Array<(.+?)>;links:Array<\{url:string \| null;label:string;active:boolean;\}>;meta:\{current_page:number;first_page_url:string;from:number \| null;last_page:number;last_page_url:string;next_page_url:string \| null;path:string;per_page:number;prev_page_url:string \| null;to:number \| null;total:number;\};\};?/g;
    const replacementString = "LengthAwarePaginator<$1>;";
    let newContent = originalContent.replace(paginatorRegex, replacementString);

    // Remove all instances of "App.Data."
    newContent = newContent.replace(/App\.Data\./g, "");
    newContent = newContent.replace(/App\.Data/g, "Data");

    // Read PHP enums dynamically to generate replacements and types
    const enumsDir = osPath.join('app', 'Enums');
    const enumFiles = await fs.readdir(enumsDir);
    const enumNames: string[] = [];

    for (const file of enumFiles) {
      if (!file.endsWith('.php')) continue;

      const filePath = osPath.join(enumsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');

      // Extract enum name
      const enumNameMatch = content.match(/enum (\w+): string/);
      if (enumNameMatch) {
        enumNames.push(enumNameMatch[1]);
      }
    }

    // Replace enum references with types derived from runtime enums
    for (const enumName of enumNames) {
      newContent = newContent.replace(new RegExp(`App\\.Enums\\.${enumName}`, 'g'), `EnumType.${enumName}`);
    }

    // Convert declare namespace to namespace
    newContent = newContent.replace(/declare namespace /g, 'namespace ');

    // Remove App.Enums namespace entirely since we generate enums separately
    newContent = newContent.replace(/namespace App\.Enums[\s\S]*?\n}/g, '');

    if (originalContent !== newContent) {
      await fs.writeFile(fullPath, newContent, "utf-8");
      pluginContext.info(
        `[laravel-data] Refactored paginator types, removed "App.Data.", and replaced namespace declaration in ${filePath}.`,
      );
    }

    // Generate enums after refactoring types
    await generateEnums(pluginContext);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      pluginContext.warn(
        `[laravel-data] Could not find file to refactor at: ${filePath}`,
      );
    } else {
      pluginContext.error(
        `[laravel-data] Failed to refactor paginator types:\n${error}`,
      );
    }
  }
};


export const laravelDataTypes = ({
  patterns = ['app/Data/**/*.php', 'app/Enums/**/*.php'],
  command = 'php artisan typescript:transform',
  path,
  extraArgs = [],
  refactorPaginators = true,
}: LaravelDataTypesOptions = {}): Plugin => {
  patterns = patterns.map((pattern) => pattern.replace('\\', '/'));

  const args: string[] = [...extraArgs];
  if (path) {
    args.push(`--path=${path}`);
  }

  const runCommand = async () => {
    try {
      await execAsync(`${command} ${args.join(' ')}`);
      context.info('[laravel-data] TypeScript types generated.');

      if (refactorPaginators) {
        await refactorPaginatorInFile(context);
      }
    } catch (error) {
      context.error('[laravel-data] Failed to generate types:\n' + error);
    }
  };

  return {
    name: 'laravel-data-types',
    enforce: 'pre',
    buildStart() {
      // eslint-disable-next-line
      context = this;
      return runCommand();
    },
    async handleHotUpdate({ file, server }) {
      if (shouldRun(patterns, { file, server })) {
        await runCommand();
      }
    },
  };
};

const shouldRun = (patterns: string[], opts: Pick<HmrContext, 'file' | 'server'>): boolean => {
  const file = opts.file.replaceAll('\\', '/');

  return patterns.some((pattern) => {
    pattern = osPath.resolve(opts.server.config.root, pattern).replaceAll('\\', '/');
    return minimatch(file, pattern);
  });
};