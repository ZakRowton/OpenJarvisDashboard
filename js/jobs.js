/**
 * Background job runner for job nodes.
 */
(function () {
    var listEl = document.getElementById('running-jobs-list');
    if (!listEl || typeof jQuery === 'undefined') return;

    var jobs = {};
    var responseCache = {};
    var renderQueued = false;
    var graphStateQueued = false;
    var activePollRequests = {};
    var pollTimer = null;
    var POLL_INTERVAL_MS = 150;

    function looksLikeHtmlSnippet(code) {
        if (!code) return false;
        return /<\/?[a-z][\s\S]*>/i.test(code) || /<script[\s\S]*>/i.test(code) || /<canvas[\s\S]*>/i.test(code);
    }

    function looksLikeJavaScriptSnippet(code) {
        if (!code) return false;
        return /\b(const|let|var|function|document\.|window\.|new\s+[A-Z]|console\.|setTimeout|setInterval)\b/.test(code);
    }

    function inferCodeLanguage(text) {
        if (looksLikeHtmlSnippet(text)) return 'html';
        if (looksLikeJavaScriptSnippet(text)) return 'javascript';
        return '';
    }

    function parseJobSteps(content) {
        return String(content || '')
            .split(/\r?\n/)
            .map(function (line) { return line.trim(); })
            .filter(function (line) {
                return /^(-|\*|\d+\.)\s+/.test(line);
            })
            .map(function (line) {
                return line.replace(/^(-|\*|\d+\.)\s+/, '').trim();
            })
            .filter(function (line) { return line !== ''; });
    }

    function buildStepPrompt(name, stepText, stepIndex, totalSteps) {
        return [
            'You are executing one step from a larger job file.',
            'Complete only this step well.',
            'If the best output is a visual/chart/demo, return a fenced html code block that renders directly in-browser.',
            'If the output is text, return clean readable markdown/plain text without extra surrounding commentary.',
            'Do not return a table wrapper for the whole job.',
            'Job: ' + name,
            'Step ' + stepIndex + ' of ' + totalSteps + ': ' + stepText
        ].join('\n');
    }

    function formatStepResponse(step) {
        if (!step) return '';
        var text = String(step.response || '');
        var trimmed = text.trim();
        if (!trimmed) return '(No response returned.)';
        if (/```/.test(trimmed)) return trimmed;
        var language = inferCodeLanguage(trimmed);
        if (language) {
            return '```' + language + '\n' + trimmed + '\n```';
        }
        return trimmed;
    }

    function buildFinalJobResponse(name, steps) {
        var parts = [];
        parts.push('Job: ' + name);
        parts.push('');
        (steps || []).forEach(function (step, index) {
            parts.push('Step ' + (index + 1) + ': ' + step.task);
            parts.push('');
            parts.push(formatStepResponse(step));
            parts.push('');
        });
        return parts.join('\n');
    }

    function escapeHtml(value) {
        if (!value) return '';
        var div = document.createElement('div');
        div.textContent = value;
        return div.innerHTML;
    }

    function getRunningNodeIds() {
        return Object.keys(jobs).filter(function (name) {
            return jobs[name] && jobs[name].state === 'running' && jobs[name].nodeId;
        }).map(function (name) {
            return jobs[name].nodeId;
        });
    }

    function uniq(list) {
        var out = [];
        (list || []).forEach(function (item) {
            if (out.indexOf(item) === -1) out.push(item);
        });
        return out;
    }

    function signalGraphActivity(sections, nodeIds, durationMs) {
        if (typeof window.MemoryGraphSignalActivity !== 'function') return;
        window.MemoryGraphSignalActivity({
            sections: Array.isArray(sections) ? sections : [],
            nodeIds: Array.isArray(nodeIds) ? nodeIds : [],
            durationMs: durationMs || 2600
        });
    }

    function syncGraphState() {
        if (typeof window.agentState === 'undefined') return;
        var runningIds = getRunningNodeIds();
        var aggregatedToolIds = [];
        var aggregatedMemoryIds = [];
        var aggregatedInstructionIds = [];
        var aggregatedMcpIds = [];
        var aggregatedExecutionDetails = {};
        var anyGettingTools = false;
        var anyCheckingMemory = false;
        var anyCheckingInstructions = false;
        var anyCheckingMcps = false;
        var anyCheckingJobs = runningIds.length > 0;

        Object.keys(jobs).forEach(function (name) {
            var job = jobs[name];
            var status = job && job.lastStatus ? job.lastStatus : null;
            if (!job || job.state !== 'running' || !status) return;
            var executionDetails = status.executionDetailsByNode && typeof status.executionDetailsByNode === 'object'
                ? status.executionDetailsByNode
                : {};
            anyGettingTools = anyGettingTools || !!status.gettingAvailTools;
            anyCheckingMemory = anyCheckingMemory || !!status.checkingMemory;
            anyCheckingInstructions = anyCheckingInstructions || !!status.checkingInstructions;
            anyCheckingMcps = anyCheckingMcps || !!status.checkingMcps || !!executionDetails.mcps;
            aggregatedToolIds = aggregatedToolIds.concat(status.activeToolIds || []);
            aggregatedMemoryIds = aggregatedMemoryIds.concat(status.activeMemoryIds || []);
            aggregatedInstructionIds = aggregatedInstructionIds.concat(status.activeInstructionIds || []);
            aggregatedMcpIds = aggregatedMcpIds.concat(status.activeMcpIds || []);
            Object.keys(executionDetails).forEach(function (key) {
                aggregatedExecutionDetails[key] = executionDetails[key];
                if (key.indexOf('tool_') === 0) aggregatedToolIds.push(key);
                if (key.indexOf('memory_file_') === 0) aggregatedMemoryIds.push(key);
                if (key.indexOf('instruction_file_') === 0) aggregatedInstructionIds.push(key);
                if (key.indexOf('mcp_server_') === 0) aggregatedMcpIds.push(key);
            });
        });

        if (typeof window.agentState.applyBackgroundJobState === 'function') {
            window.agentState.applyBackgroundJobState({
                checkingJobs: anyCheckingJobs,
                gettingAvailTools: anyGettingTools,
                checkingMemory: anyCheckingMemory,
                checkingInstructions: anyCheckingInstructions,
                checkingMcps: anyCheckingMcps,
                activeJobIds: runningIds,
                activeToolIds: uniq(aggregatedToolIds),
                activeMemoryIds: uniq(aggregatedMemoryIds),
                activeInstructionIds: uniq(aggregatedInstructionIds),
                activeMcpIds: uniq(aggregatedMcpIds),
                executionDetailsByNode: aggregatedExecutionDetails,
                durationMs: anyCheckingJobs ? 3200 : 2400
            });
        } else {
            window.agentState.setBackgroundCheckingJobs(runningIds.length > 0);
            window.agentState.setBackgroundJobIds(runningIds);
            window.agentState.setBackgroundGettingAvailTools(anyGettingTools);
            window.agentState.setBackgroundCheckingMemory(anyCheckingMemory);
            window.agentState.setBackgroundCheckingInstructions(anyCheckingInstructions);
            window.agentState.setBackgroundCheckingMcps(anyCheckingMcps);
            window.agentState.setBackgroundActiveToolIds(uniq(aggregatedToolIds));
            window.agentState.setBackgroundActiveMemoryIds(uniq(aggregatedMemoryIds));
            window.agentState.setBackgroundActiveInstructionIds(uniq(aggregatedInstructionIds));
            window.agentState.setBackgroundActiveMcpIds(uniq(aggregatedMcpIds));
            window.agentState.setBackgroundExecutionDetailsByNode(aggregatedExecutionDetails);
            signalGraphActivity(
                [
                    runningIds.length ? 'agent' : '',
                    anyGettingTools ? 'tools' : '',
                    anyCheckingMemory ? 'memory' : '',
                    anyCheckingInstructions ? 'instructions' : '',
                    anyCheckingMcps ? 'mcps' : '',
                    anyCheckingJobs ? 'jobs' : ''
                ].filter(Boolean),
                ['agent'].concat(uniq(aggregatedToolIds.concat(aggregatedMemoryIds, aggregatedInstructionIds, aggregatedMcpIds, runningIds))),
                anyCheckingJobs ? 3200 : 2400
            );
        }
        if (typeof window.MemoryGraphUpdateExecutionPanel === 'function') window.MemoryGraphUpdateExecutionPanel();
    }

    function scheduleGraphStateSync() {
        if (graphStateQueued) return;
        graphStateQueued = true;
        requestAnimationFrame(function () {
            graphStateQueued = false;
            syncGraphState();
        });
    }

    function scheduleRenderJobs() {
        if (renderQueued) return;
        renderQueued = true;
        requestAnimationFrame(function () {
            renderQueued = false;
            renderJobs();
        });
    }

    function setJobState(name, patch) {
        jobs[name] = jobs[name] || {};
        Object.keys(patch || {}).forEach(function (key) {
            jobs[name][key] = patch[key];
        });
        scheduleGraphStateSync();
        scheduleRenderJobs();
    }

    function scheduleCompletedRemoval(name) {
        var job = jobs[name];
        if (!job) return;
        if (job.removeTimeout) {
            clearTimeout(job.removeTimeout);
        }
        job.expiresAt = Date.now() + 60000;
        job.removeTimeout = setTimeout(function () {
            if (jobs[name] && jobs[name].state === 'completed') {
                delete jobs[name];
                scheduleGraphStateSync();
                scheduleRenderJobs();
            }
        }, 60000);
    }

    function renderJobs() {
        var names = Object.keys(jobs);
        if (!names.length) {
            listEl.innerHTML = '<div class="running-job-empty">No jobs running.</div>';
            return;
        }
        listEl.innerHTML = '';
        names.forEach(function (name) {
            var job = jobs[name] || {};
            var item = document.createElement('div');
            item.className = 'running-job-item';

            var spinner = job.state === 'running'
                ? '<span class="running-job-spinner" aria-hidden="true"></span>'
                : '';
            var remainingText = '';
            if (job.state === 'completed' && job.expiresAt) {
                remainingText = '\nAuto hides in ' + Math.max(1, Math.ceil((job.expiresAt - Date.now()) / 1000)) + 's.';
            }
            var actionsHtml = '';
            if (job.state === 'running') {
                actionsHtml = '<button type="button" class="running-job-btn" data-action="stop">Stop</button>';
            } else if (job.state === 'completed') {
                actionsHtml = '<button type="button" class="running-job-btn" data-action="view">View response</button>' +
                    '<button type="button" class="running-job-btn" data-action="remove">Clear</button>';
            } else {
                actionsHtml = '<button type="button" class="running-job-btn" data-action="remove">Clear</button>';
            }

            item.innerHTML =
                '<div class="running-job-head">' +
                    '<div class="running-job-name">' + escapeHtml(name) + '</div>' +
                    spinner +
                '</div>' +
                '<div class="running-job-status">' + escapeHtml((job.statusText || 'Queued...') + remainingText) + '</div>' +
                '<div class="running-job-actions">' +
                    actionsHtml +
                '</div>';

            var buttons = item.querySelectorAll('.running-job-btn');
            Array.prototype.forEach.call(buttons, function (button) {
                button.addEventListener('click', function () {
                    var action = button.getAttribute('data-action');
                    if (action === 'stop') {
                        stopJobByName(name);
                    } else if (action === 'view') {
                        if (typeof window.MemoryGraphShowResponseModal === 'function') {
                            window.MemoryGraphShowResponseModal(jobs[name] && jobs[name].promptText ? jobs[name].promptText : ('Job: ' + name), responseCache[name] || (jobs[name] && jobs[name].fullResponse) || '');
                        }
                    } else {
                        if (jobs[name] && jobs[name].removeTimeout) {
                            clearTimeout(jobs[name].removeTimeout);
                        }
                        delete jobs[name];
                        delete responseCache[name];
                        scheduleGraphStateSync();
                        scheduleRenderJobs();
                    }
                });
            });
            listEl.appendChild(item);
        });
    }

    function stopJobByName(name) {
        var job = jobs[name];
        if (!job) return;
        if (job.request && typeof job.request.abort === 'function') {
            job.request.abort();
        }
        if (job.removeTimeout) {
            clearTimeout(job.removeTimeout);
            job.removeTimeout = null;
        }
        job.lastStatus = null;
        setJobState(name, {
            state: 'stopped',
            statusText: 'Stopped.'
        });
    }

    function stopPollingJob(name) {
        delete activePollRequests[name];
        if (!Object.keys(activePollRequests).length && pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }

    function ensurePollTimer() {
        if (pollTimer) return;
        pollTimer = setInterval(function () {
            Object.keys(activePollRequests).forEach(function (name) {
                var requestId = activePollRequests[name];
                if (!requestId || !jobs[name] || jobs[name].requestId !== requestId) {
                    delete activePollRequests[name];
                    return;
                }
                jQuery.getJSON('api/chat_status.php', { request_id: requestId })
                    .done(function (status) {
                        if (!jobs[name] || jobs[name].requestId !== requestId || activePollRequests[name] !== requestId) return;
                        jobs[name].lastStatus = status || {};
                        scheduleGraphStateSync();
                        if (status && status.thinking && jobs[name].statusText !== 'Running in background...') {
                            setJobState(name, {
                                statusText: 'Running in background...'
                            });
                        }
                    })
                    .fail(function () {});
            });
            if (!Object.keys(activePollRequests).length && pollTimer) {
                clearInterval(pollTimer);
                pollTimer = null;
            }
        }, POLL_INTERVAL_MS);
    }

    function startJobPolling(name, requestId) {
        var job = jobs[name];
        if (!job) return;
        job.pollRequestId = requestId;
        activePollRequests[name] = requestId;
        ensurePollTimer();
    }

    function finishJob(name, state, statusText) {
        setJobState(name, {
            state: state,
            statusText: statusText
        });
        if (jobs[name]) jobs[name].lastStatus = null;
        stopPollingJob(name);
        scheduleGraphStateSync();
        if (state === 'completed') {
            scheduleCompletedRemoval(name);
        }
    }

    function runNextJobStep(name) {
        var job = jobs[name];
        if (!job || job.state !== 'running') return;

        if (job.currentStepIndex >= job.steps.length) {
            var finalResponse = buildFinalJobResponse(name, job.results || []);
            responseCache[name] = finalResponse;
            if (jobs[name]) jobs[name].fullResponse = finalResponse;
            finishJob(name, 'completed', 'Completed all ' + job.steps.length + ' steps.');
            return;
        }

        var settings = (typeof window.getAgentSettings === 'function' && window.getAgentSettings()) || {};
        var stepIndex = job.currentStepIndex;
        var stepText = job.steps[stepIndex];
        var requestId = 'job_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
        var prompt = buildStepPrompt(name, stepText, stepIndex + 1, job.steps.length);

        setJobState(name, {
            requestId: requestId,
            promptText: prompt,
            statusText: 'Running step ' + (stepIndex + 1) + ' of ' + job.steps.length + ': ' + stepText
        });

        var request = jQuery.ajax({
            url: 'api/chat.php',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                requestId: requestId,
                provider: settings.provider || 'mercury',
                model: settings.model || 'mercury-2',
                systemPrompt: settings.systemPrompt || '',
                temperature: settings.temperature != null ? settings.temperature : 0.7,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (jobs[name]) jobs[name].request = request;
        startJobPolling(name, requestId);

        request.done(function (res) {
            var contentText = '';
            if (res && res.choices && res.choices[0] && res.choices[0].message) {
                contentText = res.choices[0].message.content || '';
            }
            var results = job.results || [];
            results.push({
                task: stepText,
                response: contentText
            });
            setJobState(name, {
                results: results,
                currentStepIndex: stepIndex + 1,
                statusText: 'Completed step ' + (stepIndex + 1) + ' of ' + job.steps.length + '.'
            });
            runNextJobStep(name);
        }).fail(function (xhr) {
            if (xhr && xhr.statusText === 'abort') {
                finishJob(name, 'stopped', 'Stopped.');
                return;
            }
            var msg = (xhr && xhr.responseJSON && xhr.responseJSON.error) || (xhr && xhr.statusText) || 'Step failed';
            if (msg && typeof msg === 'object') {
                msg = (msg.message !== undefined && typeof msg.message === 'string') ? msg.message : JSON.stringify(msg);
            }
            var displayMsg = (msg && String(msg).trim()) || 'Step failed';
            var results = (jobs[name] && jobs[name].results) ? jobs[name].results.slice() : [];
            results.push({
                task: stepText,
                response: 'Error: ' + displayMsg
            });
            setJobState(name, {
                results: results,
                currentStepIndex: stepIndex + 1
            });
            runNextJobStep(name);
        }).always(function () {
            if (jobs[name] && jobs[name].pollRequestId === requestId) {
                jobs[name].pollRequestId = null;
            }
            stopPollingJob(name);
            if (jobs[name] && jobs[name].requestId === requestId) {
                jobs[name].request = null;
            }
            scheduleGraphStateSync();
            scheduleRenderJobs();
        });
    }

    function runJob(name, content, options) {
        if (!name) return;
        var nodeId = options && options.nodeId ? options.nodeId : null;
        var steps = parseJobSteps(content);

        if (jobs[name] && jobs[name].state === 'running') {
            stopJobByName(name);
        }
        delete responseCache[name];

        if (!steps.length) {
            setJobState(name, {
                name: name,
                nodeId: nodeId,
                state: 'error',
                statusText: 'No job steps found. Use markdown list items like "- Task".'
            });
            return;
        }

        setJobState(name, {
            name: name,
            nodeId: nodeId,
            state: 'running',
            statusText: 'Queued ' + steps.length + ' steps...',
            steps: steps,
            currentStepIndex: 0,
            results: [],
            promptText: String(content || ''),
            fullResponse: '',
            expiresAt: 0,
            removeTimeout: null
        });

        runNextJobStep(name);
    }

    window.MemoryGraphRunJob = runJob;
    window.MemoryGraphStopJobByName = stopJobByName;
    window.MemoryGraphIsJobRunning = function (name) {
        return !!(jobs[name] && jobs[name].state === 'running');
    };

    setInterval(function () {
        var hasCompleted = Object.keys(jobs).some(function (name) {
            return jobs[name] && jobs[name].state === 'completed' && jobs[name].expiresAt;
        });
        if (hasCompleted) scheduleRenderJobs();
    }, 1000);

    renderJobs();
})();
