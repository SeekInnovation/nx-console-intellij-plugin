import type { WatchEvent, Watcher } from 'nx/src/native';
import { lspLogger } from '@nx-console/language-server-utils';
import { importNxPackagePath } from '@nx-console/shared-npm';
import { normalize } from 'path';
import { match as minimatch } from 'minimatch';

const NX_PLUGIN_PATTERNS_TO_WATCH = [
  '**/cypress.config.{js,ts,mjs,cjs}',
  '**/{detox.config,.detoxrc}.{json,js}',
  '**/app.{json,config.js}',
  '**/jest.config.{cjs,mjs,js,cts,mts,ts}',
  '**/next.config.{js,cjs,mjs}',
  '**/nuxt.config.{js,ts,mjs,mts,cjs,cts}',
  '**/playwright.config.{js,ts,cjs,cts,mjs,mts}',
  '**/remix.config.{js,cjs,mjs}',
  '**/.storybook/main.{js,ts,mjs,mts,cjs,cts}',
  '**/{vite,vitest}.config.{js,ts,mjs,mts,cjs,cts}',
  '**/webpack.config.{js,ts,mjs,cjs}',
  '**/jest.preset.js',
  '**/tsconfig.*.json',
  // nx-dotnet
  '*{.csproj,fsproj,vbproj}',
];

export class NativeWatcher {
  private watcher: Watcher | undefined;
  private stopped = false;

  constructor(
    private workspacePath: string,
    private callback: () => unknown,
  ) {
    this.initWatcher();
  }

  stop() {
    this.stopped = true;
    this.watcher?.stop();
  }

  private async initWatcher() {
    if (true as any) {
      lspLogger.log(
        'PATCHED: not running NativeWatcher, as it creates too many file watchers and processes too many events in fucking NodeJS. Will just manually refresh the NX workspace if necessary.',
      );
      return;
    }

    const native = await importNxPackagePath<typeof import('nx/src/native')>(
      this.workspacePath,
      'src/native/index.js',
      lspLogger,
    );
    this.watcher = new native.Watcher(this.workspacePath);

    // TODO [fix this shitty plugin] this plugin just fucking watches the entire workspace?! That many file-watchers will really create issues. Also does not ignore .local, dist, minio data, etc...
    this.watcher.watch((err: string | null, events: WatchEvent[]) => {
      if (err) {
        lspLogger.log('Error watching files: ' + err);
      } else if (
        events
          .map((e) => normalize(e.path))
          .some(
            (path) =>
              (path.endsWith('project.json') ||
                path.endsWith('package.json') ||
                path.endsWith('nx.json') ||
                path.endsWith('workspace.json') ||
                path.endsWith('tsconfig.base.json') ||
                NX_PLUGIN_PATTERNS_TO_WATCH.some((pattern) =>
                  minimatch([path], pattern, { dot: true }),
                )) &&
              // TODO [fix this shitty plugin] why the fuck would it refresh the workspace if ANY open document changed? removed that check, so in case we want to re-enable the watcher, at least unnecessary events won't be processed.
              // || NativeWatcher.openDocuments.has(path)
              !path.startsWith('node_modules') &&
              !path.startsWith(normalize('.nx/cache')) &&
              !path.startsWith(normalize('.yarn/cache')) &&
              !path.startsWith(normalize('.nx/workspace-data')),
          )
      ) {
        if (this.stopped) {
          this.watcher?.stop();
          return;
        }
        lspLogger.log(
          `native watcher detected project changes in files ${events
            .map((e) => normalize(e.path))
            .join(', ')}`,
        );
        this.callback();
      }
    });
  }

  private static openDocuments: Set<string> = new Set();
  static onOpenDocument(uri: string) {
    this.openDocuments.add(normalize(uri));
  }
  static onCloseDocument(uri: string) {
    this.openDocuments.delete(normalize(uri));
  }
}
