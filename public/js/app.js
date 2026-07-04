
const inputArea = document.getElementById('json-input');
const outputArea = document.getElementById('json-output');
const errorLayer = document.getElementById('error-layer');
const outputWrapper = document.getElementById('output-wrapper');
const lineGutter = document.getElementById('line-gutter');
const editorScroller = document.getElementById('editor-scroller');
const radarDot = document.getElementById('radar-error-dot');

let debounceTimeout = null;


function syncScroll() {
    requestAnimationFrame(() => {
        if (errorLayer && inputArea) {
            errorLayer.scrollTop = inputArea.scrollTop;
            errorLayer.scrollLeft = inputArea.scrollLeft;
        }
    });
}

function handleEditorScroll() {
    requestAnimationFrame(() => {
        if (lineGutter && editorScroller && errorLayer) {
            lineGutter.scrollTop = editorScroller.scrollTop;
            errorLayer.scrollLeft = editorScroller.scrollLeft;
            errorLayer.scrollTop = editorScroller.scrollTop;
        }
    });
}

function handleLiveCheck() {
    const raw = inputArea.value;
    if (!raw.trim()) {
        if (errorLayer) errorLayer.innerHTML = '';
        updateStatus("Ready", "success");
        return;
    }
    updateStatus("Typing...", "process");
}

function escapeHTML(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlight(json) {
    if (typeof json !== 'string') json = JSON.stringify(json, null, 4); 
    return escapeHTML(json).replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, m => {
        let cls = 'json-number';
        if (/^"/.test(m)) cls = /:$/.test(m) ? 'json-key' : 'json-string';
        else if (/true|false/.test(m)) cls = 'json-boolean';
        return `<span class="${cls}">${m}</span>`;
    });
}

function renderDivideOutput(parts) {
    outputWrapper.innerHTML = ''; 
    parts.forEach((p, index) => {
        const card = document.createElement('div');
        card.className = "flex flex-col bg-slate-900/40 ...";
         
        card.innerHTML = `...`; 

        const body = document.createElement('div');
        body.className = "p-4 overflow-auto max-h-[250px] custom-scroll";
        
        const pre = document.createElement('pre');
        pre.className = "text-xs text-zinc-300 font-mono"; 
        pre.innerHTML = highlight(p);
        
        body.appendChild(pre);
        card.appendChild(body);
        outputWrapper.appendChild(card);
    });
}


async function processJSONBackend(mode) {
    const rawData = inputArea.value.trim();
    if (!rawData) return;

    const startTime = performance.now();
    if (errorLayer) errorLayer.innerHTML = '';
    updateStatus("Processing...", "process");
    
    const successBanner = document.getElementById('repair-success-banner');
    if (successBanner) successBanner.style.display = 'none';

    const numParts = document.getElementById('smartParts') ? document.getElementById('smartParts').value : 3;
    const itemsPer = document.getElementById('smartItems') ? document.getElementById('smartItems').value : 4;

    const activeMode = (mode === 'raw' || mode === 'minify') ? 'minify' : mode;

    try {
        const response = await fetch('/api/process-json', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ rawData, mode: activeMode, numParts, itemsPer })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || "Network operation fault.");
        }

        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        if (mode === 'divide') {
            outputArea.className = "font-mono text-sm leading-relaxed whitespace-pre text-slate-300";
            outputWrapper.className = "flex-1 p-6 overflow-auto custom-scroll bg-slate-950/20 min-h-0 w-full";
            renderDivideOutput(result.parts);
        } else if (mode === 'raw' || mode === 'minify') {
          
            
            outputArea.className = "font-mono text-sm leading-relaxed whitespace-pre-wrap break-all text-slate-300 select-all p-6 bg-slate-950/20";
            outputWrapper.className = "flex-1 overflow-auto custom-scroll min-h-0 w-full";
            outputWrapper.innerHTML = '';
            outputWrapper.appendChild(outputArea);
            
            
            outputArea.textContent = JSON.stringify(result.data);
            updateStatus("Raw String Active", "success");
        } else {
            
            outputArea.className = "font-mono text-sm leading-relaxed whitespace-pre text-slate-300";
            outputWrapper.className = "flex-1 p-6 overflow-auto custom-scroll bg-slate-950/20 min-h-0 w-full";
            outputWrapper.innerHTML = '';
            outputWrapper.appendChild(outputArea);

            const formattedOutputString = JSON.stringify(result.data, null, 4);
            outputArea.innerHTML = highlight(formattedOutputString);

            if (mode === 'fix') {
                inputArea.value = formattedOutputString;
                if (errorLayer) errorLayer.innerHTML = '';
                if (radarDot) radarDot.style.display = 'none';
                
                runEditorEngine(); 
                triggerRealTimeValidation(); 

                if (successBanner) {
                    successBanner.style.display = 'flex';
                    setTimeout(() => { successBanner.style.display = 'none'; }, 4000);
                }
            }
        }

        const counterElement = document.getElementById('obj-count');
        if (counterElement) {
            counterElement.textContent = result.totalItems || result.itemCount || 0;
        }
        if (mode !== 'raw' && mode !== 'minify') updateStatus("Success", "success");

    } catch (err) {
        updateStatus("Engine Error", "error");
        outputWrapper.innerHTML = '';
        outputWrapper.appendChild(outputArea);
        outputArea.className = "font-mono text-sm p-4 text-red-400 bg-red-950/10 rounded-xl border border-red-900/30 whitespace-pre-wrap leading-relaxed";
        outputArea.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-2"></i><strong>System Alert:</strong> ${err.message}`;
    } finally {
        const timeElement = document.getElementById('process-time');
        if (timeElement) {
            timeElement.textContent = `${Math.round(performance.now() - startTime)}ms`;
        }
    }
}


async function executeDivideLogic() {
    await processJSONBackend('divide');
    closeDivideModal();
}

function renderDivideOutput(parts) {
    outputWrapper.innerHTML = ''; 
    outputWrapper.className = "flex-1 p-4 overflow-auto custom-scroll grid grid-cols-1 xl:grid-cols-2 gap-4 auto-rows-max w-full bg-slate-950/20";

    parts.forEach((p, index) => {
        const card = document.createElement('div');
        card.className = "flex flex-col bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all shadow-xl h-fit";
        
        card.innerHTML = `
            <div class="flex justify-between items-center px-4 py-3 bg-white/5 border-b border-white/5">
                <span class="text-blue-400 font-bold text-xs">PART ${index + 1} <span class="text-zinc-500 text-[10px]">(${p.length} Items)</span></span>
                <button onclick="copyChunk(this)" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition-all active:scale-95 shadow-md">COPY</button>
            </div>
            <div class="p-4 overflow-auto max-h-[250px] custom-scroll">
                <pre class="text-xs text-zinc-300 font-mono">${highlight(p)}</pre>
            </div>
        `;
        outputWrapper.appendChild(card);
    });
}


function copyChunk(btn) {
    const text = btn.parentElement.nextElementSibling.innerText;
    navigator.clipboard.writeText(text).then(() => {
        btn.innerHTML = 'COPIED';
        btn.className = "px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-all pointer-events-none shadow-md shadow-emerald-900/20";
    }).catch(err => {
        console.error("Copy karne me dikkat aayi: ", err);
    });
}


function copyChunk(btn) {
    
    const text = btn.parentElement.nextElementSibling.innerText;
    
    navigator.clipboard.writeText(text).then(() => {
        
        btn.innerHTML = 'COPIED';
        
        btn.className = "px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-all pointer-events-none cursor-default shadow-md";
        
        
        btn.onclick = null; 
        
        console.log("Locked permanently as COPIED!");
    }).catch(err => {
        console.error("Copy handler failure: ", err);
    });
};

function runEditorEngine() {
    const rawData = inputArea.value;
    const lines = rawData.split('\n');
    const totalLines = lines.length || 1;

    
    let gutterHTML = '';
    const maxGutterRender = Math.min(totalLines, 1000); 
    for (let i = 1; i <= maxGutterRender; i++) {
        gutterHTML += `<div id="ln-row-${i}">${i}</div>`;
    }
    if (totalLines > 1000) gutterHTML += `<div>...</div>`;
    if (lineGutter) lineGutter.innerHTML = gutterHTML;

    
    const computedHeight = Math.max(totalLines * 22 + 32, editorScroller ? editorScroller.clientHeight : 400);
    if (inputArea) inputArea.style.height = computedHeight + 'px';
    if (errorLayer) errorLayer.style.height = computedHeight + 'px';

    if (!rawData.trim()) {
        if (errorLayer) errorLayer.innerHTML = '';
        if (radarDot) radarDot.style.display = 'none';
        updateStatus("Ready", "success");
        return;
    }

   
    
    try {
        JSON.parse(rawData);
        if (errorLayer) errorLayer.innerHTML = ''; 
        if (radarDot) radarDot.style.display = 'none';
        updateStatus("Valid JSON", "success");
        
        const listRoot = document.getElementById('diagnostics-list-root');
        const badge = document.getElementById('err-indicator-badge');
        if (badge) {
            badge.className = "px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-500";
            badge.textContent = "CLEAR";
        }
        if (listRoot) listRoot.innerHTML = `<div class="p-3 bg-emerald-500/5 text-emerald-400 text-xs rounded-xl flex items-center gap-2 border border-emerald-500/10"><i class="fa-solid fa-circle-check"></i> Code syntax is clean.</div>`;
    } catch (err) {
        
        parseAndHighlightError(rawData, err.message, lines);
    }
}


function parseAndHighlightError(text, errMsg, lines) {
    let errorLineIdx = -1;
    
    const positionMatch = errMsg.match(/at position (\d+)/i);
    if (positionMatch) {
        const absoluteCharPos = parseInt(positionMatch[1]);
        errorLineIdx = text.substring(0, absoluteCharPos).split('\n').length - 1;
    } else {
        const lineMatch = errMsg.match(/line (\d+)/i);
        if (lineMatch) errorLineIdx = parseInt(lineMatch[1]) - 1;
    }

    if (errorLineIdx >= 0 && errorLineIdx < lines.length) {
        if (errorLayer) {
            errorLayer.innerHTML = lines.map((lineText, idx) => {
                if (idx === errorLineIdx) {
                    return `<div class="bg-red-500/10 border-l-[3px] border-red-500 w-full block">${lineText || ' '}</div>`;
                }
                return `<div>${lineText || ' '}</div>`;
            }).join('');
        }

       
        const targetGutterRow = document.getElementById(`ln-row-${errorLineIdx + 1}`);
        if (targetGutterRow) {
            targetGutterRow.className = "text-red-500 font-black scale-105 transition-all";
        }

        
        if (editorScroller && radarDot) {
            const totalScrollHeight = editorScroller.scrollHeight;
            const visibleContainerHeight = editorScroller.clientHeight;

            if (totalScrollHeight > visibleContainerHeight) {
                const errorRowY = errorLineIdx * 22 + 16;
                const trackPercentage = errorRowY / totalScrollHeight;
                radarDot.style.top = `calc(${trackPercentage * 100}% - 3px)`;
                radarDot.style.display = 'block';
            } else {
                radarDot.style.display = 'none';
            }
        };
        
        const listRoot = document.getElementById('diagnostics-list-root');
        const badge = document.getElementById('err-indicator-badge');
        if (badge) {
            badge.className = "px-2 py-0.5 rounded-full text-[9px] font-black bg-red-500/10 text-red-500";
            badge.textContent = "1 ERROR";
        }
        if (listRoot) {
            listRoot.innerHTML = `
                <div class="p-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl text-xs cursor-pointer transition-all" onclick="if(editorScroller) editorScroller.scrollTop = ${errorLineIdx * 22}; inputArea.focus();">
                    <div class="flex justify-between font-bold text-[10px] text-red-400 uppercase mb-1">
                        <span>Syntax Error</span>
                        <span class="bg-red-500/20 px-1 rounded font-mono text-[9px]">Ln ${errorLineIdx + 1}</span>
                    </div>
                    <p class="font-mono text-[11px] text-zinc-300 break-words leading-relaxed">${errMsg}</p>
                </div>
            `;
        }
        updateStatus(`Error Line ${errorLineIdx + 1}`, "error");
    }
};


async function triggerRealTimeValidation() {
    const jsonString = inputArea.value;
    if (!jsonString.trim()) return;

    try {
        const response = await fetch('/validate-json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonString })
        });
        const result = await response.json();
        
        const listRoot = document.getElementById('diagnostics-list-root');
        const badge = document.getElementById('err-indicator-badge');
        
        if (!listRoot) return;
        listRoot.innerHTML = '';

        if (result.valid) {
            if (badge) {
                badge.className = "px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-500";
                badge.textContent = "CLEAR";
            }
            listRoot.innerHTML = `<div class="p-3 bg-emerald-500/5 text-emerald-400 text-xs rounded-xl flex items-center gap-2 border border-emerald-500/10"><i class="fa-solid fa-circle-check"></i> Code compilation layout clear.</div>`;
            if (errorLayer) errorLayer.innerHTML = '';
            if (radarDot) radarDot.style.display = 'none';
            updateStatus("Valid JSON", "success");
            return;
        }

        if (badge) {
            badge.className = "px-2 py-0.5 rounded-full text-[9px] font-black bg-red-500/10 text-red-500";
            badge.textContent = `${result.errors.length} ERRORS`;
        }

        const lines = jsonString.split('\n');
        const errorLineNumbers = result.errors.map(e => e.line);

        if (errorLayer) {
            errorLayer.innerHTML = lines.map((lineText, idx) => {
                if (errorLineNumbers.includes(idx + 1)) {
                    return `<div class="bg-red-500/10 border-l-[3px] border-red-500 w-full block">${lineText || ' '}</div>`;
                }
                return `<div>${lineText || ' '}</div>`;
            }).join('');
        }

        result.errors.forEach(err => {
            const card = document.createElement('div');
            card.className = "p-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl text-xs cursor-pointer transition-all";
            card.onclick = () => {
                if (editorScroller) editorScroller.scrollTop = (err.line - 1) * 22;
                inputArea.focus();
            };
            card.innerHTML = `
                <div class="flex justify-between font-bold text-[10px] text-red-400 uppercase mb-1">
                    <span>${err.type}</span>
                    <span class="bg-red-500/20 px-1 rounded font-mono text-[9px]">Ln ${err.line}</span>
                </div>
                <p class="font-mono text-[11px] text-zinc-300 break-words leading-relaxed">${err.message}</p>
            `;
            listRoot.appendChild(card);
        });

        if (result.errors.length > 0 && editorScroller && radarDot) {
            const totalScrollHeight = editorScroller.scrollHeight;
            const visibleContainerHeight = editorScroller.clientHeight;
            if (totalScrollHeight > visibleContainerHeight) {
                const trackPercentage = ((result.errors[0].line - 1) * 22 + 16) / totalScrollHeight;
                radarDot.style.top = `calc(${trackPercentage * 100}% - 3px)`;
                radarDot.style.display = 'block';
            }
        }
        updateStatus(`${result.errors.length} Errors Found`, "error");

    } catch (e) { console.error(e); }
};

if (inputArea) {
    inputArea.addEventListener('input', () => {
        handleLiveCheck();
        syncScroll();
        runEditorEngine();

        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            triggerRealTimeValidation();
        }, 350);
    });
}

function updateStatus(msg, type) {
    const dot = document.getElementById('status-dot');
    const log = document.getElementById('error-log');
    if (!log) return;
    log.textContent = `ENGINE: ${msg.toUpperCase()}`;
    if (type === "success") {
        log.className = "text-emerald-500";
        if (dot) dot.className = "w-2 h-2 rounded-full bg-emerald-500";
    } else if (type === "error") {
        log.className = "text-red-400";
        if (dot) dot.className = "w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]";
    } else {
        log.className = "text-amber-400";
        if (dot) dot.className = "w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#fbbf24]";
    }
}


function openDivideModal() { document.getElementById('divideModal').style.display = 'flex'; }
function closeDivideModal() { document.getElementById('divideModal').style.display = 'none'; }
function switchMode(mode) {
    const isSmart = mode === 'smart';
    document.getElementById('smartInputs').style.display = isSmart ? 'block' : 'none';
    document.getElementById('btnSmart').style.borderBottom = isSmart ? '2px solid #3b82f6' : 'none';
    document.getElementById('btnRange').style.borderBottom = isSmart ? 'none' : '2px solid #3b82f6';
}
function triggerFilePicker() { document.getElementById('file-uploader').click(); }
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = (evt) => { 
        inputArea.value = evt.target.result; 
        runEditorEngine(); 
        triggerRealTimeValidation(); 
    };
    r.readAsText(file);
}
function copyOutput() {
    navigator.clipboard.writeText(outputWrapper.innerText);
    const toast = document.getElementById('copy-toast');
    if (toast) {
        toast.classList.remove('opacity-0', 'translate-y-24');
        setTimeout(() => toast.classList.add('opacity-0', 'translate-y-24'), 2000);
    }
}
function downloadJSON() {
    const blob = new Blob([outputWrapper.innerText], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `output_${Date.now()}.json`; a.click();
}
function resetAppWorkspace() {
    if (inputArea) inputArea.value = '';
    resetLogsPanel();
}
function resetLogsPanel() {
    if (errorLayer) errorLayer.innerHTML = '';
    if (radarDot) radarDot.style.display = 'none';
    outputWrapper.innerHTML = '<pre id="json-output" class="font-mono text-sm leading-relaxed whitespace-pre text-slate-300"></pre>';
    const listRoot = document.getElementById('diagnostics-list-root');
    if (listRoot) listRoot.innerHTML = `<div class="text-xs text-zinc-500 text-center py-8"><i class="fa-solid fa-circle-check text-2xl text-emerald-500 mb-2 block"></i> Engine active. Start typing...</div>`;
    if (document.getElementById('obj-count')) document.getElementById('obj-count').textContent = '0';
    updateStatus("Ready", "success");
};


async function pasteFromClipboard() {
    try {
        
        const text = await navigator.clipboard.readText();
        if (inputArea) {
            inputArea.value = text;
            
            
            handleLiveCheck();
            syncScroll();
            if (typeof runEditorEngine === 'function') runEditorEngine();
            if (typeof triggerRealTimeValidation === 'function') triggerRealTimeValidation();
        }
    } catch (err) {
        console.error("Clipboard se read karne me dikkat aayi: ", err);
        alert("Clipboard read permission allow kijiye!");
    }
}


function clearAll() {
    if (inputArea) inputArea.value = '';
    
    
    if (typeof resetLogsPanel === 'function') {
        resetLogsPanel();
    } else {
        if (errorLayer) errorLayer.innerHTML = '';
        if (radarDot) radarDot.style.display = 'none';
        if (outputWrapper) outputWrapper.innerHTML = '<pre id="json-output" class="font-mono text-sm leading-relaxed whitespace-pre text-slate-300"></pre>';
        if (document.getElementById('obj-count')) document.getElementById('obj-count').textContent = '0';
        updateStatus("Idle", "success");
    }
    
    
    if (lineGutter) lineGutter.innerHTML = '<div>1</div>';
};




