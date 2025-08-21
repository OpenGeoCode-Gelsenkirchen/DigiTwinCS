import {glob} from 'glob';
import fs from 'node:fs/promises';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {ViteImageOptimizer} from 'vite-plugin-image-optimizer';
import license from 'vite-plugin-license';
import {viteStaticCopy} from 'vite-plugin-static-copy';

async function copyFiles(files, srcDir = 'public', destDir = 'dist') {
    for (const file of files) {
        const dest = file.replace(srcDir, destDir);
        await fs.mkdir(path.dirname(dest), {recursive: true});
        await fs.copyFile(file, dest);
    }
}

function backToForwardSlash(path) {
    return path.replace(/\\/g, '/');
}

const cesiumBaseUrl = 'cesiumStatic';

export default defineConfig(({mode, command}) => {
    const env = loadEnv(mode, path.resolve(__dirname, 'env'));

    return {
        envDir: './env',
        publicDir: command === 'build' ? 'false' : 'public',
        base: './',
        define: {
            CESIUM_BASE_URL: JSON.stringify(`./${cesiumBaseUrl}`),
        },
        build: {
            target: 'esnext',
            rollupOptions: {
                input: './index.html',
                output: {
                    entryFileNames: '[name].js',
                    chunkFileNames: '[name].js',
                    assetFileNames: '[name].[ext]',
                },
            },
            minify: 'terser',
            terserOptions: {
                format: {
                    comments: false,
                },
                compress: true,
                mangle: {
                    toplevel: true,
                    module: true,
                    properties: false,
                },
            },
        },
        plugins: [
            license({
                thirdParty: {
                    output: './dist/licenses.txt',
                },
            }),
            viteStaticCopy({
                targets: [
                    {
                        src: 'node_modules/@cesium/engine/Build/Workers',
                        dest: cesiumBaseUrl,
                    },
                    {
                        src: 'node_modules/@cesium/engine/Source/Assets',
                        dest: cesiumBaseUrl,
                    },
                    {
                        src: 'node_modules/@cesium/engine/Source/ThirdParty',
                        dest: cesiumBaseUrl,
                    },
                    {
                        src: './src/viewshed/viewshed.glsl',
                        dest: 'glsl',
                    },
                    {
                        src: './LICENSE',
                        dest: '.',
                    },
                ],
            }),
            ViteImageOptimizer({}),
            {
                name: 'custom-copy-files',
                async writeBundle() {
                    async function resolvePaths(inputPath, projectFiles) {
                        if (!inputPath || !projectFiles) return undefined;
                        return projectFiles === '*'
                            ? await glob(
                                  backToForwardSlash(
                                      path.resolve(inputPath, '*'),
                                  ),
                                  {
                                      nodir: true,
                                  },
                              )
                            : projectFiles
                                  .split(',')
                                  .map(p => path.resolve(inputPath, p));
                    }

                    const localProjectFiles = await resolvePaths(
                        env.VITE_LOCAL_PROJECT_PATH,
                        env.VITE_LOCAL_PROJECT_FILES,
                    );
                    const globalProjectFiles = await resolvePaths(
                        env.VITE_GLOBAL_PROJECT_PATH,
                        env.VITE_GLOBAL_PROJECT_FILES,
                    );
                    const partialProjectFiles = await resolvePaths(
                        env.VITE_PARTIAL_PROJECT_PATH,
                        env.VITE_PARTIAL_PROJECT_FILES,
                    );

                    const localeResults = await Promise.all(
                        env.VITE_I18N_NAMESPACES.split(',').map(async ns => {
                            const p = path.join(
                                env.VITE_I18N_LOCALES_PATH,
                                '**',
                                `${ns}.json`,
                            );
                            return await glob(
                                backToForwardSlash(path.resolve(p)),
                            );
                        }),
                    );

                    const localePaths = localeResults.flat();

                    const rest = await glob('public/**/*', {
                        nodir: true,
                        ignore: ['public/projectFiles/**', 'public/locales/**'],
                    });

                    console.log(
                        localProjectFiles,
                        globalProjectFiles,
                        partialProjectFiles,
                        localePaths,
                    );

                    if (localProjectFiles) await copyFiles(localProjectFiles);
                    if (globalProjectFiles) await copyFiles(globalProjectFiles);
                    if (partialProjectFiles)
                        await copyFiles(partialProjectFiles);
                    if (localePaths) await copyFiles(localePaths);
                    if (rest) await copyFiles(rest);
                },
            },
        ],
    };
});
