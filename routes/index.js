const express = require('express');
const router = express.Router();
const { jsonrepair } = require('jsonrepair');


function serverShuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}


function compileAllJsonErrors(jsonString) {
    const errorsCollection = [];
    const lines = jsonString.split('\n');
    
    if (!jsonString.trim()) return errorsCollection;

    
    
    const maxLinesToCheck = Math.min(lines.length, 500);

    for (let i = 0; i < maxLinesToCheck; i++) {
        let currentLineText = lines[i].trim();
        let currentLineNum = i + 1;

        if (!currentLineText) continue;

        
        if (i < lines.length - 1) {
            let nextLineText = lines[i + 1].trim();
            if (currentLineText.endsWith('"') && nextLineText.startsWith('"') && !currentLineText.endsWith(',')) {
                errorsCollection.push({
                    line: currentLineNum,
                    column: lines[i].length + 1,
                    type: "Syntax Error",
                    message: "Expected token ',' or missing structural delimiter after property value."
                });
            }
        }

        
        if (currentLineText.endsWith(',') && (i === lines.length - 1 || lines[i+1].trim().startsWith(']')) || currentLineText.endsWith(', }') || currentLineText.endsWith(', ]')) {
            errorsCollection.push({
                line: currentLineNum,
                column: lines[i].lastIndexOf(',') + 1,
                type: "Trailing Comma Error",
                message: "Trailing comma is invalid in strict JSON specifications rules."
            });
        }
        
        const keyMatch = currentLineText.match(/^([a-zA-Z0-9_]+)\s*:/);
        if (keyMatch) {
            errorsCollection.push({
                line: currentLineNum,
                column: lines[i].indexOf(keyMatch[1]) + 1,
                type: "Key Quotes Error",
                message: `Property key '${keyMatch[1]}' must be wrapped inside double quotes.`
            });
        }

        
        if (currentLineText.includes("'")) {
            errorsCollection.push({
                line: currentLineNum,
                column: lines[i].indexOf("'") + 1,
                type: "Syntax Error",
                message: "Strings must use double quotes instead of single quotes."
            });
        }
    }

    if (errorsCollection.length === 0) {
        try {
            JSON.parse(jsonString);
        } catch (err) {
            let line = 1, column = 1;
            const errMsg = err.message;
            const posMatch = errMsg.match(/at position (\d+)/i);
            if (posMatch) {
                const position = parseInt(posMatch[1]);
                for (let i = 0; i < position; i++) {
                    if (jsonString[i] === '\n') { line++; column = 1; } else { column++; }
                }
            } else {
                const lineMatch = errMsg.match(/line (\d+)/i);
                if (lineMatch) line = parseInt(lineMatch[1]);
            }
            errorsCollection.push({ line, column, type: "Syntax Error", message: errMsg });
        }
    }
    return errorsCollection;
}


router.get('/', (req, res) => {
    res.render('index');
});


router.post('/api/process-json', (req, res) => {
    
    const { rawData, mode, numParts, itemsPer } = req.body;

    if (!rawData || !rawData.trim()) {
        return res.status(400).json({ success: false, error: "Input payload khali hai!" });
    }

    try {
        let processedData;

        
        if (mode === 'fix' || mode === 'minify') {
            
            let fixedRaw = jsonrepair(rawData);
            processedData = JSON.parse(fixedRaw);
            
            
            if (Array.isArray(processedData)) {
                processedData = processedData.flat(1);
            }
            
            let itemsCount = Array.isArray(processedData) ? processedData.length : 1;
            
           
            return res.json({ 
                success: true, 
                mode, 
                data: processedData, 
                totalItems: itemsCount 
            });
        }

        
        let safeRaw = jsonrepair(rawData);
        let mergedRaw = safeRaw.replace(/\]\s*\[/g, ',');
        let parsedData = JSON.parse(mergedRaw);

        if (Array.isArray(parsedData)) {
            parsedData = parsedData.flat(1);
        } else {
            parsedData = [parsedData];
        }

        if (mode === 'shuffle') {
            processedData = serverShuffle([...parsedData]);
        } else if (mode === 'divide') {
            let parts = [];
            let pointer = 0;
            let partsCount = parseInt(numParts) || 1;
            let size = parseInt(itemsPer) || 1;

            for (let i = 0; i < partsCount; i++) {
                if (pointer >= parsedData.length) break;
                let chunk = (i === partsCount - 1) ? parsedData.slice(pointer) : parsedData.slice(pointer, pointer + size);
                if (chunk.length > 0) {
                    parts.push(chunk);
                    pointer += chunk.length;
                }
            }
            return res.json({ success: true, mode, parts, totalItems: parsedData.length });
        } else {
            processedData = parsedData; 
        }

        let totalCount = Array.isArray(processedData) ? processedData.length : 1;
        return res.json({ success: true, mode, data: processedData, totalItems: totalCount });

    } catch (err) {
        return res.status(400).json({ success: false, error: "Core Engine Exception: " + err.message });
    }
});


router.post('/validate-json', (req, res) => {
    const { jsonString } = req.body;

    if (!jsonString || jsonString.trim() === '') {
        return res.json({ valid: true, errors: [] });
    }

    const detectedAnomalies = compileAllJsonErrors(jsonString);

    if (detectedAnomalies.length === 0) {
        return res.json({ valid: true, errors: [] });
    } else {
        return res.json({ valid: false, errors: detectedAnomalies });
    }
});












module.exports = router;