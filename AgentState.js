class AgentState {
    constructor() {
        this.parentAgentNode = null;
        this.nodeGroups = {};
        this.isThinking = false;
        this.gettingAvailTools = false;
        this.checkingMemory = false;
        this.checkingInstructions = false;
        this.checkingMcps = false;
        this.checkingJobs = false;
        this.activeToolIds = [];
        this.activeMemoryIds = [];
        this.activeInstructionIds = [];
        this.activeResearchIds = [];
        this.activeRulesIds = [];
        this.activeCategoryIds = [];
        this.activeMcpIds = [];
        this.activeJobIds = [];
        this.backgroundGettingAvailTools = false;
        this.backgroundCheckingMemory = false;
        this.backgroundCheckingInstructions = false;
        this.backgroundCheckingMcps = false;
        this.backgroundCheckingJobs = false;
        this.backgroundActiveToolIds = [];
        this.backgroundActiveMemoryIds = [];
        this.backgroundActiveInstructionIds = [];
        this.backgroundActiveResearchIds = [];
        this.backgroundActiveRulesIds = [];
        this.backgroundActiveCategoryIds = [];
        this.backgroundActiveMcpIds = [];
        this.backgroundJobIds = [];
        this.backgroundExecutionDetailsByNode = {};
        this.executionDetailsByNode = {};
        this.toolExecuting = false;
        this.memoryToolExecuting = false;
        this.instructionToolExecuting = false;
        this.mcpToolExecuting = false;
        this.jobExecuting = false;
        this.isAccessingMemoryFile = false;
        this.memoryFileAccessHoldMs = 4500;
        this.activityHoldMs = 2200;
        this.recentAgentActivityUntil = 0;
        this.recentSectionActivityUntil = { tools: 0, memory: 0, instructions: 0, research: 0, rules: 0, categories: 0, mcps: 0, jobs: 0 };
        this.recentNodeActivityUntil = {};
        this.nodeActivityUntil = {};
    }
    // ... other methods unchanged ...
    setThinking(thinking) {
        const newVal = !!thinking;
        if (this.isThinking === newVal) {
            // No state change, avoid redundant dispatch that could cause loops
            return;
        }
        this.isThinking = newVal;
        if (newVal) {
            this.recentAgentActivityUntil = this.holdUntil();
            this.markNodeActivity(['agent']);
        }
        this.dispatchGraphActivity();
    }
    // ... rest of file unchanged ...
}
