package dev.nx.console.angular

//@Service(Service.Level.PROJECT)
//@State(name = "NxAngularConfigService", storages = [Storage("nx-angular-config.xml")])
//class NxAngularConfigService(private val project: Project, private val cs: CoroutineScope) :
//    PersistentStateComponent<NxAngularConfigService.AngularConfigState> {
//
//    init {
//        project.messageBus
//            .connect(cs)
//            .subscribe(NX_WORKSPACE_REFRESH_TOPIC, NxWorkspaceRefreshListener { refresh() })
//    }
//
//    var config: NxAngularConfig? = null
//
//    override fun getState(): AngularConfigState? =
//        config?.let { config ->
//            AngularConfigState().apply {
//                workspaceLocation = config.file.url
//                projects = config.projectFiles.mapValues { it.value.url }.toMutableMap()
//            }
//        }
//
//    override fun noStateLoaded() {
//        refresh()
//    }
//
//    override fun loadState(state: AngularConfigState) {
//        val vfManager = VirtualFileManager.getInstance()
//        val workspaceFile = state.workspaceLocation?.let { vfManager.findFileByUrl(it) }
//        val projectFiles =
//            state.projects
//                .mapNotNull { (name, url) -> vfManager.findFileByUrl(url)?.let { Pair(name, it) } }
//                .toMap()
//        config = if (workspaceFile != null) NxAngularConfig(workspaceFile, projectFiles) else null
//        refresh()
//    }
//
//    private fun refresh() {
//        cs.launch { refreshState() }
//    }
//
//    private suspend fun refreshState() {
//        val workspace = NxlsService.getInstance(project).workspace()
//        if (workspace == null) {
//            updateConfig(null)
//            return
//        }
//        val manager = VirtualFileManager.getInstance()
//        val workspaceRoot = manager.findFileByNioPath(Path.of(workspace.workspacePath))
//        val workspaceConfig = workspaceRoot?.findFileByRelativePath("nx.json")
//        if (workspaceRoot == null || workspaceConfig == null) {
//            updateConfig(null)
//            return
//        }
//        val projectFiles =
//            workspace.projectGraph.nodes.values
//                .asSequence()
//                // TODO: use framework metadata in the future, for now just register all projects
//                //                .filter { project ->
//                //                    project.targets.values.any { it.executor.contains("angular") }
//                //                }
//                .mapNotNull { project ->
//                    workspaceRoot
//                        .findFileByRelativePath(project.data.root)
//                        ?.findFileByRelativePath("project.json")
//                        ?.let { Pair(project.name, it) }
//                }
//                .toMap()
//        updateConfig(NxAngularConfig(workspaceConfig, projectFiles))
//    }
//
//    private suspend fun updateConfig(newConfig: NxAngularConfig?) {
//        if (config != newConfig) {
//            config = newConfig
//            withContext(Dispatchers.EDT) {
//                writeAction {
//                    ProjectRootManagerEx.getInstanceEx(project)
//                        .makeRootsChange(
//                            EmptyRunnable.getInstance(),
//                            RootsChangeRescanningInfo.RESCAN_DEPENDENCIES_IF_NEEDED,
//                        )
//                }
//            }
//        }
//    }
//
//    class AngularConfigState {
//        @Attribute("workspaceLocation") var workspaceLocation: String? = null
//
//        @XMap(
//            propertyElementName = "projects",
//            entryTagName = "project",
//            keyAttributeName = "name",
//            valueAttributeName = "file",
//        )
//        var projects: MutableMap<String, String> = mutableMapOf()
//    }
//}

//internal class NxAngularConfigProvider : AngularConfigProvider {
//
//    override fun findAngularConfig(project: Project, context: VirtualFile): AngularConfig? =
//        project.service<NxAngularConfigService>().config
//}
