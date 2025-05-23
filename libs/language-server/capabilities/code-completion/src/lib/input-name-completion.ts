import { nxWorkspace } from '@nx-console/shared-nx-workspace-info';
import {
  ASTNode,
  CompletionItem,
  CompletionItemKind,
  TextDocument,
} from 'vscode-json-languageservice';
import { createCompletionItem } from './create-completion-path-item';
import { lspLogger } from '@nx-console/language-server-utils';

export async function inputNameCompletion(
  workingPath: string | undefined,
  node: ASTNode,
  document: TextDocument,
  hasDependencyHat = false,
): Promise<CompletionItem[]> {
  if (!workingPath) {
    return [];
  }

  const inputNameCompletion: CompletionItem[] = [];

  const { nxJson } = await nxWorkspace(workingPath, lspLogger);

  for (const inputName of Object.keys(nxJson.namedInputs ?? {})) {
    if (hasDependencyHat) {
      inputNameCompletion.push(
        createCompletionItem(
          `^${inputName}`,
          '',
          node,
          document,
          CompletionItemKind.Property,
          `Base "${inputName}" on this project's dependencies`,
        ),
      );
    }
    inputNameCompletion.push(
      createCompletionItem(
        inputName,
        '',
        node,
        document,
        CompletionItemKind.Property,
      ),
    );
  }

  return inputNameCompletion;
}
