import { CodeLens, Command, Range, TextDocument, Uri } from 'vscode';

import { buildProjectPath } from '@nx-console/shared-file-system';
import { WorkspaceConfigurationStore } from '@nx-console/vscode-configuration';
import {
  getNxWorkspace,
  getProjectByPath,
} from '@nx-console/vscode-nx-workspace';
import { NxCodeLensProvider } from '@nx-console/vscode-utils';
import { ProjectLocations, getProjectLocations } from './get-project-locations';

export class TargetCodeLens extends CodeLens {
  constructor(
    range: Range,
    public project: string,
    public target: string,
    public configuration?: string,
  ) {
    super(range);
  }
}

export class ProjectCodeLens extends CodeLens {
  constructor(
    range: Range,
    public project: string,
    public projectPath: string,
  ) {
    super(range);
  }
}

export class TaskGraphCodeLens extends CodeLens {
  constructor(
    range: Range,
    public project: string,
    public target: string,
  ) {
    super(range);
  }
}

export class WorkspaceCodeLensProvider implements NxCodeLensProvider {
  CODELENS_PATTERN = { pattern: '**/{workspace,project}.json' };
  /**
   * Provides a CodeLens set for a matched document
   * @param document a document matched by the pattern passed to registerCodeLensProvider
   * @returns ProjectCodeLens Range locations and properties for the document
   */
  async provideCodeLenses(
    document: TextDocument,
  ): Promise<CodeLens[] | undefined> {
    try {
      const lens: CodeLens[] = [];

      let projectName = '';

      const documentPath = document.uri.path;

      if (documentPath.endsWith('project.json')) {
        const project = await getProjectByPath(documentPath);
        if (!project) {
          return;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          projectName = project.name!;
        }
      }

      const projectLocations = getProjectLocations(document, projectName);
      const validWorkspaceJson = (await getNxWorkspace())?.validWorkspaceJson;
      if (!validWorkspaceJson) {
        return;
      }

      for (const projectName in projectLocations) {
        const project = projectLocations[projectName];

        await this.buildProjectLenses(
          project,
          document,
          lens,
          projectName,
          WorkspaceConfigurationStore.instance.get('nxWorkspacePath', ''),
        );

        this.buildTargetLenses(project, document, lens, projectName);
      }
      return lens;
    } catch (e) {
      return [];
    }
  }
  async buildProjectLenses(
    project: ProjectLocations[string],
    document: TextDocument,
    lens: CodeLens[],
    projectName: string,
    workspacePath: string,
  ) {
    if (!project.projectPath) {
      return;
    }
    const position = document.positionAt(project.position);
    lens.push(
      new ProjectCodeLens(
        new Range(position, position),
        projectName,
        (await buildProjectPath(workspacePath, project.projectPath)) ?? '',
      ),
    );
  }

  private buildTargetLenses(
    project: ProjectLocations[string],
    document: TextDocument,
    lens: CodeLens[],
    projectName: string,
  ) {
    const projectTargets = project.targets;
    for (const target in projectTargets) {
      const position = document.positionAt(projectTargets[target].position);

      lens.push(
        new TargetCodeLens(new Range(position, position), projectName, target),
        new TaskGraphCodeLens(
          new Range(position, position),
          projectName,
          target,
        ),
      );
      const configurations = projectTargets[target].configurations;
      if (configurations) {
        for (const configuration in configurations) {
          const configurationPosition = document.positionAt(
            configurations[configuration].position,
          );

          lens.push(
            new TargetCodeLens(
              new Range(configurationPosition, configurationPosition),
              projectName,
              target,
              configuration,
            ),
          );
        }
      }
    }
  }

  /**
   * Resolves and sets the command on visible CodeLens
   * @param lens lens to be resolve
   * @returns ProjectCodeLens with command
   */
  // https://github.com/microsoft/vscode-extension-samples/blob/main/codelens-sample/src/CodelensProvider.ts
  resolveCodeLens(lens: CodeLens): CodeLens | Promise<CodeLens> | null {
    if (lens instanceof TargetCodeLens) {
      const command: Command = {
        command: `nx.run`,
        title: lens.configuration
          ? `nx run ${lens.target}:${lens.configuration}`
          : `nx run ${lens.target}`,
        arguments: [lens.project, lens.target, lens.configuration, false],
      };
      lens.command = command;
      return lens;
    }

    if (lens instanceof ProjectCodeLens) {
      const command: Command = {
        command: `vscode.open`,
        title: `Go to "${lens.project}" configuration`,
        arguments: [Uri.file(lens.projectPath)],
      };
      lens.command = command;
      return lens;
    }

    if (lens instanceof TaskGraphCodeLens) {
      lens.command = {
        command: `nx.graph.task.button`,
        title: `show nx graph for ${lens.target}`,
        arguments: [[lens.project, lens.target]],
      };
      return lens;
    }

    return null;
  }
}
