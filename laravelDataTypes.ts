import { exec } from 'child_process';
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
}

let context: PluginContext;

export const laravelDataTypes = ({
    patterns = [
        'app/Data/**/*.php',
        'app/Features/**/*.php',
        'app/Enums/**/*.php',
    ],
    command = 'php artisan effect-schema:transform',
    path,
    extraArgs = [],
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
        } catch (error) {
            // Provide stdout/stderr details when available to aid debugging inside containers
            const e: any = error;
            const details = [e.message || '', e.stdout || '', e.stderr || '']
                .filter(Boolean)
                .join('\n');
            context.error(
                '[laravel-data] Failed to generate types:\n' + details,
            );
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

const shouldRun = (
    patterns: string[],
    opts: Pick<HmrContext, 'file' | 'server'>,
): boolean => {
    const file = opts.file.replaceAll('\\', '/');

    return patterns.some((pattern) => {
        pattern = osPath
            .resolve(opts.server.config.root, pattern)
            .replaceAll('\\', '/');
        return minimatch(file, pattern);
    });
};
