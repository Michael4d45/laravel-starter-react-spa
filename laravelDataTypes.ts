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
    // Check if enums directory exists
    try {
      await fs.access(enumsDir);
    } catch {
      pluginContext.info('[laravel-data] No enums directory found, skipping enum generation.');
      return;
    }

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
 * Generates Effect schemas from the refactored TypeScript types.
 */
const generateEffectSchemas = async (
  pluginContext: PluginContext,
  refactoredContent: string,
) => {
  const schemaFilePath = './resources/js/lib/schemas/generated-schema.ts';

  try {
    // Ensure the schemas directory exists
    const schemaDir = osPath.dirname(schemaFilePath);
    await fs.mkdir(schemaDir, { recursive: true });

    const schemas: string[] = [];
    const typeExports: string[] = [];

    // Match type declarations in namespace blocks: export type TypeName = { ... };
    // This handles both standalone export type declarations and those within namespaces
    const typeRegex = /(?:^|\s)export type (\w+)\s*=\s*\{([^}]+)\};/gm;
    let typeMatch;

    while ((typeMatch = typeRegex.exec(refactoredContent)) !== null) {
      const typeName = typeMatch[1];
      const typeBody = typeMatch[2];

      const schemaName = `${typeName}Schema`;
      const schemaContent = convertTypeToEffectSchema(typeName, typeBody);

      if (schemaContent) {
        schemas.push(`export const ${schemaName} = ${schemaContent};`);
        typeExports.push(`export type ${typeName} = S.Schema.Type<typeof ${schemaName}>;`);
      }
    }

    if (schemas.length === 0) {
      pluginContext.warn('[laravel-data] No types found to convert to Effect schemas.');
      return;
    }

    // Generate the schema file content
    const schemaFileContent = `/**
 * Auto-generated Effect schemas from Laravel Data classes.
 * This file is generated by the laravelDataTypes Vite plugin.
 * Do not edit manually - changes will be overwritten.
 */

import * as S from '@effect/schema/Schema';
import { LengthAwarePaginator } from './schema';

// ============================================================================
// Generated Schemas
// ============================================================================

${schemas.join('\n\n')}

// ============================================================================
// Type Exports
// ============================================================================

${typeExports.join('\n')}
`;

    await fs.writeFile(schemaFilePath, schemaFileContent, 'utf-8');
    pluginContext.info(
      `[laravel-data] Generated ${schemas.length} Effect schemas in ${schemaFilePath}.`,
    );
  } catch (error) {
    pluginContext.error(
      `[laravel-data] Failed to generate Effect schemas:\n${error}`,
    );
  }
};

/**
 * Converts a TypeScript type to an Effect S.Struct schema.
 */
const convertTypeToEffectSchema = (typeName: string, typeBody: string): string | null => {
  const properties: string[] = [];

  // Match property declarations: propertyName: Type;
  const propertyRegex = /^\s*(\w+):\s*([^;]+);/gm;
  let propertyMatch;

  while ((propertyMatch = propertyRegex.exec(typeBody)) !== null) {
    const propertyName = propertyMatch[1];
    const typeString = propertyMatch[2].trim();

    const effectType = convertTypeScriptTypeToEffect(typeString);

    if (effectType) {
      properties.push(`    ${propertyName}: ${effectType}`);
    }
  }

  if (properties.length === 0) {
    return null;
  }

  return `S.Struct({\n${properties.join(',\n')}\n})`;
};

/**
 * Converts TypeScript types to Effect schema types.
 */
const convertTypeScriptTypeToEffect = (typeString: string): string | null => {
  // Handle union types
  if (typeString.includes(' | ')) {
    const unionTypes = typeString.split(' | ').map(t => t.trim());
    const effectTypes = unionTypes
      .map(t => convertTypeScriptTypeToEffect(t))
      .filter(Boolean);

    if (effectTypes.length > 1) {
      return `S.Union(${effectTypes.join(', ')})`;
    }
    return effectTypes[0] || null;
  }

  // Handle Array<T> types
  const arrayMatch = typeString.match(/^Array<(.+)>$/);
  if (arrayMatch) {
    const elementType = arrayMatch[1];
    const effectElementType = convertTypeScriptTypeToEffect(elementType);
    return effectElementType ? `S.Array(${effectElementType})` : null;
  }

  // Handle namespaced types (after refactoring, these become simple names or Models.*)
  if (typeString.startsWith('App.Data.')) {
    // Extract the type name from the namespace
    const parts = typeString.split('.');
    const typeName = parts[parts.length - 1];
    return `${typeName}Schema`;
  }

  // Handle Models.* references (from refactored namespace declarations)
  if (typeString.startsWith('Models.')) {
    // Extract the type name after Models.
    const typeName = typeString.replace('Models.', '');
    return `${typeName}Schema`;
  }

  // Handle LengthAwarePaginator generic
  const paginatorMatch = typeString.match(/LengthAwarePaginator<(.+)>/);
  if (paginatorMatch) {
    const genericType = paginatorMatch[1];
    const effectType = convertTypeScriptTypeToEffect(genericType);
    return effectType ? `LengthAwarePaginator(${effectType})` : 'LengthAwarePaginator(S.Unknown)';
  }

  // Basic type mappings
  switch (typeString) {
    case 'string':
      return 'S.String';
    case 'number':
      return 'S.Number';
    case 'boolean':
      return 'S.Boolean';
    case 'null':
      return 'S.Null';
    case 'undefined':
      return 'S.Undefined';
    default:
      // Handle references to other schemas (assume they'll be generated)
      if (/^[A-Z]\w*$/.test(typeString)) {
        return `${typeString}Schema`;
      }
      // Handle Carbon/Date types
      if (typeString.includes('Carbon') || typeString.includes('Date')) {
        return 'S.String';
      }
      return null;
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
    let enumNames: string[] = [];

    try {
      const enumFiles = await fs.readdir(enumsDir);
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
    } catch {
      // No enums directory, skip enum processing
      pluginContext.info('[laravel-data] No enums directory found, skipping enum replacements.');
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

    // Generate Effect schemas from the refactored types
    await generateEffectSchemas(pluginContext, newContent);
  } catch (error) {
    pluginContext.error(`[laravel-data] Error in refactorPaginatorInFile: ${error}`);
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