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
        this.backgroundActiveMcpIds = [];
        this.backgroundJobIds = [];
        this.backgroundExecutionDetailsByNode = {};
        this.executionDetailsByNode = {};
    }

    setThinking(thinking) {
        this.isThinking = thinking;
    }

    setGettingAvailTools(gettingAvailTools) {
        this.gettingAvailTools = gettingAvailTools;
    }

    setCheckingMemory(checkingMemory) {
        this.checkingMemory = checkingMemory;
    }

    setCheckingInstructions(checkingInstructions) {
        this.checkingInstructions = checkingInstructions;
    }

    setCheckingMcps(checkingMcps) {
        this.checkingMcps = checkingMcps;
    }

    setCheckingJobs(checkingJobs) {
        this.checkingJobs = checkingJobs;
    }

    setActiveToolIds(activeToolIds) {
        this.activeToolIds = Array.isArray(activeToolIds) ? activeToolIds : [];
    }

    setActiveMemoryIds(activeMemoryIds) {
        this.activeMemoryIds = Array.isArray(activeMemoryIds) ? activeMemoryIds : [];
    }

    setActiveInstructionIds(activeInstructionIds) {
        this.activeInstructionIds = Array.isArray(activeInstructionIds) ? activeInstructionIds : [];
    }

    setActiveMcpIds(activeMcpIds) {
        this.activeMcpIds = Array.isArray(activeMcpIds) ? activeMcpIds : [];
    }

    setActiveJobIds(activeJobIds) {
        this.activeJobIds = Array.isArray(activeJobIds) ? activeJobIds : [];
    }

    setBackgroundCheckingJobs(backgroundCheckingJobs) {
        this.backgroundCheckingJobs = !!backgroundCheckingJobs;
    }

    setBackgroundGettingAvailTools(backgroundGettingAvailTools) {
        this.backgroundGettingAvailTools = !!backgroundGettingAvailTools;
    }

    setBackgroundCheckingMemory(backgroundCheckingMemory) {
        this.backgroundCheckingMemory = !!backgroundCheckingMemory;
    }

    setBackgroundCheckingInstructions(backgroundCheckingInstructions) {
        this.backgroundCheckingInstructions = !!backgroundCheckingInstructions;
    }

    setBackgroundCheckingMcps(backgroundCheckingMcps) {
        this.backgroundCheckingMcps = !!backgroundCheckingMcps;
    }

    setBackgroundJobIds(backgroundJobIds) {
        this.backgroundJobIds = Array.isArray(backgroundJobIds) ? backgroundJobIds : [];
    }

    setBackgroundActiveToolIds(backgroundActiveToolIds) {
        this.backgroundActiveToolIds = Array.isArray(backgroundActiveToolIds) ? backgroundActiveToolIds : [];
    }

    setBackgroundActiveMemoryIds(backgroundActiveMemoryIds) {
        this.backgroundActiveMemoryIds = Array.isArray(backgroundActiveMemoryIds) ? backgroundActiveMemoryIds : [];
    }

    setBackgroundActiveInstructionIds(backgroundActiveInstructionIds) {
        this.backgroundActiveInstructionIds = Array.isArray(backgroundActiveInstructionIds) ? backgroundActiveInstructionIds : [];
    }

    setBackgroundActiveMcpIds(backgroundActiveMcpIds) {
        this.backgroundActiveMcpIds = Array.isArray(backgroundActiveMcpIds) ? backgroundActiveMcpIds : [];
    }

    setBackgroundExecutionDetailsByNode(backgroundExecutionDetailsByNode) {
        this.backgroundExecutionDetailsByNode = backgroundExecutionDetailsByNode && typeof backgroundExecutionDetailsByNode === 'object'
            ? backgroundExecutionDetailsByNode
            : {};
    }

    setExecutionDetailsByNode(executionDetailsByNode) {
        this.executionDetailsByNode = executionDetailsByNode && typeof executionDetailsByNode === 'object' ? executionDetailsByNode : {};
    }

    setAgentNode(node) {
        this.parentAgentNode = node;
    }

    setNodeGroup(nodeId, node) {
        this.nodeGroups[nodeId] = node;
    }
}

window.agentState = new AgentState();
