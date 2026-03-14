/**
 * 3D graph: one main Agent node + fixed child nodes + dynamic tool, memory, instruction, and job child nodes.
 */
(function () {
    var container = document.getElementById('graph-container');
    if (!container) return;

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070a, 0.01);
    var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(11, 7, 20);
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    var controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 8;
        controls.maxDistance = 60;
        controls.target.set(0.2, -0.4, 0.6);
    }

    var staticNodeData = {
        'agent': { label: 'Agent', color: 0xd9e4ff, highlight: true },
        'memory': { label: 'Memory', color: 0x47d7c9, sub: true, radius: 0.42, glowScale: 1.82 },
        'tools': { label: 'Tools', color: 0xffc857, sub: true, radius: 0.42, glowScale: 1.82 },
        'instructions': { label: 'Instructions', color: 0x7cb8ff, sub: true, radius: 0.42, glowScale: 1.82 },
        'mcps': { label: 'MCPs', color: 0x6be38e, sub: true, radius: 0.42, glowScale: 1.82 },
        'jobs': { label: 'Jobs', color: 0xff8f70, sub: true, radius: 0.42, glowScale: 1.82 }
    };
    var staticEdges = [
        { from: 'agent', to: 'memory' },
        { from: 'agent', to: 'tools' },
        { from: 'agent', to: 'instructions' },
        { from: 'agent', to: 'mcps' },
        { from: 'agent', to: 'jobs' }
    ];
    var staticPositions = {
        'agent': [0, 0, 0],
        'memory': [-7.4, 4.6, 4.1],
        'tools': [7.2, 3.8, -3.6],
        'instructions': [-1.1, -7.6, 5.3],
        'mcps': [-8.1, -3.6, -4.8],
        'jobs': [8.3, -2.9, 4.4]
    };

    var nodeMeshes = {};
    var nodeGroups = {};
    var nodeMeshesList = [];
    var nodeGlowMeta = [];
    var nodeGlowById = {};
    var nodeMetaById = {};
    var galaxyGroup = new THREE.Group();
    var shootingStars = [];
    var nodeGroup = new THREE.Group();
    var edgeGroup = new THREE.Group();
    scene.add(galaxyGroup);
    scene.add(nodeGroup);
    scene.add(edgeGroup);

    function clearGraph() {
        while (nodeGroup.children.length) nodeGroup.remove(nodeGroup.children[0]);
        while (edgeGroup.children.length) edgeGroup.remove(edgeGroup.children[0]);
        nodeMeshes = {};
        nodeGroups = {};
        nodeMeshesList = [];
        nodeGlowMeta = [];
        nodeGlowById = {};
        nodeMetaById = {};
        if (typeof window.agentState !== 'undefined') {
            window.agentState.nodeGroups = {};
            window.agentState.parentAgentNode = null;
        }
    }

    function createGalaxyBackground() {
        var starCount = 1200;
        var positions = new Float32Array(starCount * 3);
        var colors = new Float32Array(starCount * 3);
        for (var i = 0; i < starCount; i++) {
            var radius = 34 + Math.random() * 90;
            var theta = Math.random() * Math.PI * 2;
            var phi = Math.acos((Math.random() * 2) - 1);
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.cos(phi) * 0.72;
            positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
            var shade = 0.62 + Math.random() * 0.38;
            colors[i * 3] = shade;
            colors[i * 3 + 1] = shade;
            colors[i * 3 + 2] = Math.min(1, shade + 0.06);
        }
        var starsGeometry = new THREE.BufferGeometry();
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        var starsMaterial = new THREE.PointsMaterial({
            size: 0.2,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            vertexColors: true
        });
        galaxyGroup.add(new THREE.Points(starsGeometry, starsMaterial));

        var dustCount = 420;
        var dustPositions = new Float32Array(dustCount * 3);
        for (var j = 0; j < dustCount; j++) {
            var dustRadius = 16 + Math.random() * 28;
            var dustAngle = Math.random() * Math.PI * 2;
            dustPositions[j * 3] = Math.cos(dustAngle) * dustRadius;
            dustPositions[j * 3 + 1] = (Math.random() - 0.5) * 10;
            dustPositions[j * 3 + 2] = Math.sin(dustAngle) * dustRadius * 0.68;
        }
        var dustGeometry = new THREE.BufferGeometry();
        dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
        var dustMaterial = new THREE.PointsMaterial({
            color: 0x9ea7b0,
            size: 0.52,
            transparent: true,
            opacity: 0.08,
            depthWrite: false
        });
        galaxyGroup.add(new THREE.Points(dustGeometry, dustMaterial));

        for (var k = 0; k < 4; k++) {
            var lineGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(-2.8, 0.22, 0)
            ]);
            var lineMaterial = new THREE.LineBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0
            });
            var line = new THREE.Line(lineGeometry, lineMaterial);
            line.visible = false;
            scene.add(line);
            shootingStars.push({
                line: line,
                velocity: new THREE.Vector3(),
                ttl: 0,
                wait: 800 + Math.random() * 2000
            });
        }
    }

    function resetShootingStar(meta) {
        meta.wait = 1200 + Math.random() * 3200;
        meta.ttl = 0.75 + Math.random() * 0.6;
        meta.velocity.set(-16 - Math.random() * 10, -4 - Math.random() * 6, -1 + Math.random() * 2);
        meta.line.position.set(16 + Math.random() * 16, 10 + Math.random() * 10, -8 + Math.random() * 16);
        meta.line.visible = false;
        meta.line.material.opacity = 0;
    }

    function createNode(id, data, pos) {
        var r = data.radius || (data.highlight ? 0.58 : 0.36);
        var glowScale = data.glowScale || (data.highlight ? 1.95 : 1.72);
        var group = new THREE.Group();
        group.position.set(pos[0], pos[1], pos[2]);
        group.userData.clickedUntil = 0;
        var isDisabled = data.active === false;

        var glowGeom = new THREE.SphereGeometry(r * glowScale, 32, 32);
        var glowMat = new THREE.MeshBasicMaterial({
            color: isDisabled ? 0x4b5563 : data.color,
            transparent: true,
            opacity: isDisabled ? 0.05 : 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        var glowMesh = new THREE.Mesh(glowGeom, glowMat);
        glowMesh.renderOrder = -1;
        group.add(glowMesh);
        nodeGlowMeta.push({ id: id, mesh: glowMesh, baseOpacity: isDisabled ? 0.05 : 0.2 });
        nodeGlowById[id] = glowMesh;

        var shellGeom = new THREE.SphereGeometry(r * 1.02, 32, 32);
        var shellMat = new THREE.MeshPhysicalMaterial({
            color: isDisabled ? 0x3f464f : data.color,
            emissive: isDisabled ? 0x3f464f : data.color,
            emissiveIntensity: isDisabled ? 0.05 : 0.2,
            roughness: 0.22,
            metalness: 0.94,
            clearcoat: 1,
            clearcoatRoughness: 0.08,
            transparent: true,
            opacity: isDisabled ? 0.55 : 0.82
        });
        var shellMesh = new THREE.Mesh(shellGeom, shellMat);
        group.add(shellMesh);

        var coreGeom = new THREE.SphereGeometry(r * 0.78, 32, 32);
        var coreMat = new THREE.MeshPhongMaterial({
            color: isDisabled ? 0x2f353c : 0x0c1016,
            emissive: isDisabled ? 0x4b5563 : data.color,
            emissiveIntensity: isDisabled ? 0.12 : 0.82,
            specular: 0xffffff,
            shininess: 110
        });
        var coreMesh = new THREE.Mesh(coreGeom, coreMat);
        coreMesh.userData = { id: id, label: data.label, disabled: isDisabled };
        group.add(coreMesh);

        var innerGeom = new THREE.SphereGeometry(r * 0.3, 20, 20);
        var innerMat = new THREE.MeshBasicMaterial({
            color: isDisabled ? 0x747d86 : data.color,
            transparent: true,
            opacity: isDisabled ? 0.12 : 0.24
        });
        var innerMesh = new THREE.Mesh(innerGeom, innerMat);
        group.add(innerMesh);
        if (isDisabled) {
            group.scale.set(0.94, 0.94, 0.94);
        }

        nodeGroup.add(group);
        nodeMeshes[id] = coreMesh;
        nodeGroups[id] = group;
        nodeMeshesList.push(coreMesh);
        if (typeof window.agentState !== 'undefined') {
            window.agentState.setNodeGroup(id, group);
            if (id === 'agent') window.agentState.setAgentNode(group);
        }
        nodeMetaById[id] = {
            shellMesh: shellMesh,
            innerMesh: innerMesh,
            disabled: isDisabled
        };
    }

    function createEdge(fromId, toId, fromMesh, toMesh, nodeData) {
        var posA = fromMesh.parent.position;
        var posB = toMesh.parent.position;
        var fromDisabled = nodeData[fromId] && nodeData[fromId].active === false;
        var toDisabled = nodeData[toId] && nodeData[toId].active === false;
        var edgeDisabled = fromDisabled || toDisabled;
        var geom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(posA.x, posA.y, posA.z),
            new THREE.Vector3(posB.x, posB.y, posB.z)
        ]);
        var mat = new THREE.LineBasicMaterial({
            color: edgeDisabled ? 0x5b6575 : 0xa9d4ff,
            transparent: true,
            opacity: edgeDisabled ? 0.18 : 0.5
        });
        edgeGroup.add(new THREE.Line(geom, mat));
    }

    function buildGraph(tools, memories, instructions, mcps, jobs) {
        clearGraph();
        var nodeData = JSON.parse(JSON.stringify(staticNodeData));
        var edges = staticEdges.slice();
        var positions = JSON.parse(JSON.stringify(staticPositions));

        var toolsBasePos = positions.tools;
        (tools || []).forEach(function (tool, i) {
            var toolId = 'tool_' + tool.name;
            nodeData[toolId] = { label: tool.name, color: 0xffd36f, sub: true, active: tool.active !== false, radius: 0.24, glowScale: 1.65 };
            edges.push({ from: 'tools', to: toolId });
            var count = Math.max((tools || []).length, 1);
            var angle = (i / count) * Math.PI * 2;
            var dist = 3.8;
            var tilt = ((i % 3) - 1) * 0.85;
            positions[toolId] = [
                toolsBasePos[0] + Math.cos(angle) * dist * 0.95,
                toolsBasePos[1] + Math.sin(angle) * dist * 0.75 + tilt,
                toolsBasePos[2] + Math.sin(angle * 1.5 + 0.7) * 2.2
            ];
        });

        var memoryBasePos = positions.memory;
        (memories || []).forEach(function (memory, i) {
            var memoryId = memory.nodeId;
            nodeData[memoryId] = {
                label: memory.title,
                color: 0x59ead9,
                sub: true,
                active: memory.active !== false,
                radius: 0.24,
                glowScale: 1.65
            };
            edges.push({ from: 'memory', to: memoryId });
            var count = Math.max((memories || []).length, 1);
            var angle = (i / count) * Math.PI * 2;
            var dist = 3.8;
            var tilt = ((i % 3) - 1) * 0.75;
            positions[memoryId] = [
                memoryBasePos[0] + Math.cos(angle) * dist * 0.9,
                memoryBasePos[1] + Math.sin(angle) * dist * 0.8 + tilt,
                memoryBasePos[2] + Math.cos(angle * 1.7 + 0.35) * 2.1
            ];
        });

        var instructionsBasePos = positions.instructions;
        (instructions || []).forEach(function (instruction, i) {
            var instructionId = instruction.nodeId;
            nodeData[instructionId] = {
                label: instruction.title,
                color: 0x8dc5ff,
                sub: true,
                radius: 0.24,
                glowScale: 1.65
            };
            edges.push({ from: 'instructions', to: instructionId });
            var count = Math.max((instructions || []).length, 1);
            var angle = (i / count) * Math.PI * 2;
            var dist = 3.8;
            var tilt = ((i % 3) - 1) * 0.8;
            positions[instructionId] = [
                instructionsBasePos[0] + Math.cos(angle) * dist * 0.9,
                instructionsBasePos[1] + Math.sin(angle) * dist * 0.82 + tilt,
                instructionsBasePos[2] + Math.sin(angle * 1.6 + 0.42) * 2.2
            ];
        });

        var mcpsBasePos = positions.mcps;
        (mcps || []).forEach(function (server, i) {
            var mcpId = server.nodeId;
            nodeData[mcpId] = {
                label: server.title || server.name,
                color: 0x85f2a8,
                sub: true,
                active: server.active !== false,
                radius: 0.24,
                glowScale: 1.65
            };
            edges.push({ from: 'mcps', to: mcpId });
            var count = Math.max((mcps || []).length, 1);
            var angle = (i / count) * Math.PI * 2;
            var dist = 3.8;
            var tilt = ((i % 3) - 1) * 0.78;
            positions[mcpId] = [
                mcpsBasePos[0] + Math.cos(angle) * dist * 0.9,
                mcpsBasePos[1] + Math.sin(angle) * dist * 0.8 + tilt,
                mcpsBasePos[2] + Math.sin(angle * 1.45 + 0.25) * 2.1
            ];
        });

        var jobsBasePos = positions.jobs;
        (jobs || []).forEach(function (job, i) {
            var jobId = job.nodeId;
            nodeData[jobId] = {
                label: job.title,
                color: 0xff9f7f,
                sub: true,
                radius: 0.24,
                glowScale: 1.65
            };
            edges.push({ from: 'jobs', to: jobId });
            var count = Math.max((jobs || []).length, 1);
            var angle = (i / count) * Math.PI * 2;
            var dist = 3.8;
            var tilt = ((i % 3) - 1) * 0.78;
            positions[jobId] = [
                jobsBasePos[0] + Math.cos(angle) * dist * 0.92,
                jobsBasePos[1] + Math.sin(angle) * dist * 0.8 + tilt,
                jobsBasePos[2] + Math.cos(angle * 1.4 + 0.18) * 2.15
            ];
        });

        Object.keys(nodeData).forEach(function (id) {
            createNode(id, nodeData[id], positions[id] || [0, 0, 0]);
        });
        edges.forEach(function (edge) {
            if (nodeMeshes[edge.from] && nodeMeshes[edge.to]) {
                createEdge(edge.from, edge.to, nodeMeshes[edge.from], nodeMeshes[edge.to], nodeData);
            }
        });
    }

    function loadDynamicNodes() {
        return Promise.all([
            fetch('api_tools.php?action=list').then(function (res) { return res.json(); }),
            fetch('api_memory.php?action=list').then(function (res) { return res.json(); }),
            fetch('api_instructions.php?action=list').then(function (res) { return res.json(); }),
            fetch('api_mcps.php?action=list').then(function (res) { return res.json(); }),
            fetch('api_jobs.php?action=list').then(function (res) { return res.json(); })
        ]).then(function (results) {
            var toolData = results[0] || {};
            var memoryData = results[1] || {};
            var instructionData = results[2] || {};
            var mcpData = results[3] || {};
            var jobData = results[4] || {};
            window.toolsData = toolData.tools || [];
            window.memoryFiles = memoryData.memories || [];
            window.instructionFiles = instructionData.instructions || [];
            window.mcpServers = mcpData.servers || [];
            window.jobFiles = jobData.jobs || [];
            buildGraph(window.toolsData, window.memoryFiles, window.instructionFiles, window.mcpServers, window.jobFiles);
        }).catch(function () {});
    }
    window.MemoryGraphRefresh = loadDynamicNodes;

    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    function doPick(clientX, clientY) {
        var canvas = renderer.domElement;
        var rect = canvas.getBoundingClientRect();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        scene.updateMatrixWorld(true);
        raycaster.setFromCamera(mouse, camera);
        var intersects = raycaster.intersectObjects(nodeMeshesList, false);
        if (!intersects.length) return false;
        var obj = intersects[0].object;
        if (!obj.userData || !obj.userData.id) return false;
        var id = obj.userData.id;
        var label = obj.userData.label;
        if (nodeGroups[id]) {
            nodeGroups[id].userData.clickedUntil = performance.now() + 800;
        }
        document.dispatchEvent(new CustomEvent('graphNodeClick', {
            detail: { id: id, label: label },
            bubbles: true
        }));
        if (typeof window.MemoryGraphShowNodePanel === 'function') {
            window.MemoryGraphShowNodePanel(label, id);
        }
        return true;
    }
    renderer.domElement.addEventListener('mousedown', function (event) {
        if (doPick(event.clientX, event.clientY)) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);
    renderer.domElement.addEventListener('click', function (event) {
        doPick(event.clientX, event.clientY);
    }, true);

    createGalaxyBackground();
    shootingStars.forEach(resetShootingStar);

    var amb = new THREE.AmbientLight(0xcfd6de, 0.62);
    scene.add(amb);
    var dir = new THREE.DirectionalLight(0xffffff, 0.28);
    dir.position.set(5, 8, 10);
    scene.add(dir);
    var point = new THREE.PointLight(0xbac4cf, 0.2, 46);
    point.position.set(-5, 5, 8);
    scene.add(point);

    var clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        var delta = clock.getDelta();
        var t = clock.elapsedTime;
        if (controls) controls.update();

        galaxyGroup.rotation.y += delta * 0.01;
        galaxyGroup.rotation.x = Math.sin(t * 0.08) * 0.04;

        shootingStars.forEach(function (meta) {
            if (meta.wait > 0) {
                meta.wait -= delta * 1000;
                if (meta.wait <= 0) {
                    meta.line.visible = true;
                    meta.line.material.opacity = 0.85;
                }
                return;
            }
            meta.ttl -= delta;
            meta.line.position.addScaledVector(meta.velocity, delta);
            meta.line.material.opacity = Math.max(0, meta.ttl / 1.2);
            if (meta.ttl <= 0) {
                resetShootingStar(meta);
            }
        });

        nodeGlowMeta.forEach(function (item, i) {
            var wave = Math.sin(t * 1.2 + i * 0.3) * 0.06;
            item.mesh.material.opacity = Math.max(0.08, Math.min(0.38, item.baseOpacity + wave));
        });

        if (typeof window.agentState !== 'undefined' && window.agentState.isThinking && window.agentState.parentAgentNode) {
            var agentPulse = 1.0 + Math.sin(t * 12) * 0.15;
            window.agentState.parentAgentNode.scale.set(agentPulse, agentPulse, agentPulse);
            if (nodeMeshes.agent && nodeMeshes.agent.material) {
                nodeMeshes.agent.material.emissiveIntensity = 0.85 + Math.sin(t * 12) * 0.5;
            }
        } else if (nodeGroups.agent && nodeMeshes.agent) {
            nodeGroups.agent.scale.set(1, 1, 1);
            nodeMeshes.agent.material.emissiveIntensity = nodeMeshes.agent.material.color.getHex() === 0x4b5563 ? 0.25 : 0.85;
        }

        function animateNode(id, enabled, speed, amp, base) {
            var group = nodeGroups[id];
            var mesh = nodeMeshes[id];
            var glow = nodeGlowById[id];
            var meta = nodeMetaById[id] || null;
            if (!group || !mesh || !mesh.material) return;
            var clicked = performance.now() < (group.userData.clickedUntil || 0);
            if (enabled || clicked) {
                var pulse = 1.0 + Math.sin(t * speed) * amp + (clicked ? 0.12 : 0);
                group.scale.set(pulse, pulse, pulse);
                mesh.material.emissiveIntensity = base + Math.sin(t * speed) * (amp * 3.4) + (clicked ? 0.35 : 0);
                if (glow && glow.material) {
                    glow.material.opacity = Math.max(0.2, Math.min(0.78, 0.36 + Math.sin(t * speed) * 0.22 + (clicked ? 0.16 : 0)));
                }
                if (meta && meta.shellMesh && meta.shellMesh.material) {
                    meta.shellMesh.material.emissiveIntensity = meta.disabled ? 0.05 : (clicked ? 0.4 : 0.2);
                }
                if (meta && meta.innerMesh && meta.innerMesh.material) {
                    meta.innerMesh.material.opacity = meta.disabled ? 0.12 : (clicked ? 0.35 : 0.18);
                }
            } else if (id !== 'agent') {
                group.scale.set(1, 1, 1);
                mesh.material.emissiveIntensity = mesh.material.color.getHex() === 0x4b5563 ? 0.25 : 0.68;
                if (glow && glow.material) {
                    glow.material.opacity = mesh.material.color.getHex() === 0x4b5563 ? 0.05 : 0.2;
                }
                if (meta && meta.shellMesh && meta.shellMesh.material) {
                    meta.shellMesh.material.emissiveIntensity = meta.disabled ? 0.05 : 0.16;
                }
                if (meta && meta.innerMesh && meta.innerMesh.material) {
                    meta.innerMesh.material.opacity = meta.disabled ? 0.12 : 0.18;
                }
            }
        }

        var state = typeof window.agentState !== 'undefined' ? window.agentState : null;
        var activeToolIds = state && Array.isArray(state.activeToolIds) ? state.activeToolIds.slice() : [];
        var activeMemoryIds = state && Array.isArray(state.activeMemoryIds) ? state.activeMemoryIds.slice() : [];
        var activeInstructionIds = state && Array.isArray(state.activeInstructionIds) ? state.activeInstructionIds.slice() : [];
        var activeMcpIds = state && Array.isArray(state.activeMcpIds) ? state.activeMcpIds.slice() : [];
        var activeJobIds = state && Array.isArray(state.activeJobIds) ? state.activeJobIds.slice() : [];
        var backgroundToolIds = state && Array.isArray(state.backgroundActiveToolIds) ? state.backgroundActiveToolIds : [];
        var backgroundMemoryIds = state && Array.isArray(state.backgroundActiveMemoryIds) ? state.backgroundActiveMemoryIds : [];
        var backgroundInstructionIds = state && Array.isArray(state.backgroundActiveInstructionIds) ? state.backgroundActiveInstructionIds : [];
        var backgroundMcpIds = state && Array.isArray(state.backgroundActiveMcpIds) ? state.backgroundActiveMcpIds : [];
        var backgroundJobIds = state && Array.isArray(state.backgroundJobIds) ? state.backgroundJobIds : [];
        backgroundToolIds.forEach(function (id) {
            if (activeToolIds.indexOf(id) === -1) activeToolIds.push(id);
        });
        backgroundMemoryIds.forEach(function (id) {
            if (activeMemoryIds.indexOf(id) === -1) activeMemoryIds.push(id);
        });
        backgroundInstructionIds.forEach(function (id) {
            if (activeInstructionIds.indexOf(id) === -1) activeInstructionIds.push(id);
        });
        backgroundMcpIds.forEach(function (id) {
            if (activeMcpIds.indexOf(id) === -1) activeMcpIds.push(id);
        });
        backgroundJobIds.forEach(function (id) {
            if (activeJobIds.indexOf(id) === -1) activeJobIds.push(id);
        });

        animateNode('tools', !!(state && ((state.gettingAvailTools || state.backgroundGettingAvailTools) || activeToolIds.length)), 12, 0.2, 1.2);
        animateNode('memory', !!(state && ((state.checkingMemory || state.backgroundCheckingMemory) || activeMemoryIds.length)), 12, 0.2, 1.2);
        animateNode('instructions', !!(state && ((state.checkingInstructions || state.backgroundCheckingInstructions) || activeInstructionIds.length)), 12, 0.2, 1.2);
        animateNode('mcps', !!(state && ((state.checkingMcps || state.backgroundCheckingMcps) || activeMcpIds.length)), 12, 0.2, 1.2);
        animateNode('jobs', !!(state && ((state.checkingJobs || state.backgroundCheckingJobs) || activeJobIds.length)), 12, 0.2, 1.2);

        Object.keys(nodeGroups).forEach(function (id) {
            if (id.indexOf('tool_') === 0) {
                animateNode(id, activeToolIds.indexOf(id) !== -1, 13, 0.24, 1.2);
            }
            if (id.indexOf('memory_file_') === 0) {
                animateNode(id, activeMemoryIds.indexOf(id) !== -1, 13, 0.24, 1.2);
            }
            if (id.indexOf('instruction_file_') === 0) {
                animateNode(id, activeInstructionIds.indexOf(id) !== -1, 13, 0.24, 1.2);
            }
            if (id.indexOf('mcp_server_') === 0) {
                animateNode(id, activeMcpIds.indexOf(id) !== -1, 13, 0.24, 1.2);
            }
            if (id.indexOf('job_file_') === 0) {
                animateNode(id, activeJobIds.indexOf(id) !== -1, 13, 0.24, 1.2);
            }
        });

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    loadDynamicNodes();
})();
