import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  NxMcpServerWrapper,
  NxWorkspaceInfoProvider,
} from '@nx-console/nx-mcp-server';
import { findMatchingProject } from '@nx-console/shared-npm';
import { isNxCloudUsed } from '@nx-console/shared-nx-cloud';
import { IdeCallbackMessage } from '@nx-console/shared-types';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import {
  getGenerators,
  getNxWorkspace,
  getNxWorkspaceProjects,
} from '@nx-console/vscode-nx-workspace';
import { getOutputChannel } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import {
  getGitDiffs,
  getNxMcpPort,
  vscodeLogger,
} from '@nx-console/vscode-utils';
import express from 'express';
import { commands, window } from 'vscode';

export interface McpServerReturn {
  server: NxMcpServerWrapper;
  app: express.Application;
  server_instance: ReturnType<express.Application['listen']>;
}

let mcpServerReturn: McpServerReturn | undefined;

export async function tryStartMcpServer(workspacePath: string) {
  const port = getNxMcpPort();
  if (!port) {
    return;
  }

  const nxWorkspaceInfoProvider: NxWorkspaceInfoProvider = {
    nxWorkspace: async (_, __, reset) => await getNxWorkspace(reset),
    getGenerators: async (_, options) => await getGenerators(options),
    getGitDiffs: async (workspacePath, baseSha, headSha) => {
      return getGitDiffs(workspacePath, baseSha, headSha);
    },
    isNxCloudEnabled: await isNxCloudUsed(workspacePath, vscodeLogger),
  };
  const server = new NxMcpServerWrapper(
    workspacePath,
    nxWorkspaceInfoProvider,
    mcpIdeCallback,
    getTelemetry(),
    vscodeLogger,
  );

  const app = express();
  let transport: SSEServerTransport;
  app.get('/sse', async (req, res) => {
    vscodeLogger.log('SSE connection established');
    transport = new SSEServerTransport('/messages', res);
    await server.getMcpServer().connect(transport);

    // Set up a keep-alive interval to prevent timeout
    const keepAliveInterval = setInterval(() => {
      // Check if the connection is still open using the socket's writable state
      if (!res.writableEnded && !res.writableFinished) {
        // Send a heart beat
        res.write(':beat\n\n');
      } else {
        clearInterval(keepAliveInterval);
        vscodeLogger.log('SSE connection closed, clearing keep-alive interval');
      }
    }, 20000);

    // Clean up interval if the client disconnects
    req.on('close', () => {
      clearInterval(keepAliveInterval);
      vscodeLogger.log('SSE connection closed by client');
    });
  });

  app.post('/messages', async (req, res) => {
    if (!transport) {
      res.status(400).send('No transport found');
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  const server_instance = app.listen(port);
  vscodeLogger.log(`MCP server started on port ${port}`);

  mcpServerReturn = { server, app, server_instance };
}

export async function restartMcpServer() {
  stopMcpServer();
  await tryStartMcpServer(getNxWorkspacePath());
}

export function stopMcpServer() {
  if (mcpServerReturn) {
    getOutputChannel().appendLine('Stopping MCP server');
    mcpServerReturn.server_instance.close();
  }
}

export function updateMcpServerWorkspacePath(workspacePath: string) {
  if (mcpServerReturn) {
    mcpServerReturn.server.setNxWorkspacePath(workspacePath);
  }
}

async function mcpIdeCallback(callbackMessage: IdeCallbackMessage) {
  const type = callbackMessage.type;
  if (type === 'focus-project') {
    const payload = callbackMessage.payload;

    const workspaceProjects = await getNxWorkspaceProjects();
    const project = await findMatchingProject(
      payload.projectName,
      workspaceProjects,
      getNxWorkspacePath(),
    );
    if (!project) {
      window.showErrorMessage(`Cannot find project "${payload.projectName}"`);
      return;
    }
    commands.executeCommand('nx.graph.focus', project.name);
  } else if (type === 'focus-task') {
    const payload = callbackMessage.payload;

    const workspaceProjects = await getNxWorkspaceProjects();
    const project = await findMatchingProject(
      payload.projectName,
      workspaceProjects,
      getNxWorkspacePath(),
    );
    if (!project) {
      window.showErrorMessage(`Cannot find project "${payload.projectName}"`);
      return;
    }
    if (!project.data.targets?.[payload.taskName]) {
      window.showErrorMessage(
        `Cannot find task "${payload.taskName}" in project "${payload.projectName}"`,
      );
      return;
    }

    commands.executeCommand('nx.graph.task', {
      projectName: project.name,
      taskName: payload.taskName,
    });
  } else if (type === 'full-project-graph') {
    commands.executeCommand('nx.graph.showAll');
  }
}
