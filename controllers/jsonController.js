// --- NEW UPGRADED MULTI-ERROR LOCATOR ENGINE (Kahi bhi crash nahi hoga) ---
function compileAllJsonErrors(jsonString) {
    const errorsCollection = [];
    const lines = jsonString.split('\n');
    
    // Agar input khali hai toh direct clear return karo
    if (!jsonString.trim()) return errorsCollection;

    // STEP 1: Pehle basic brace balance matching system lagate hain complex errors check karne ke liye
    let openBraces = 0;
    let openBrackets = 0;
    
    // STEP 2: Line by line diagnostic testing template
    for (let i = 0; i < lines.length; i++) {
        let currentLineText = lines[i].trim();
        let currentLineNum = i + 1;

        // Skip khali lines or structural boundary comments
        if (!currentLineText) continue;

        // Check 1: Missing comma detector loop inside rows (bina key-value check crash kiye)
        if (i < lines.length - 1) {
            let nextLineText = lines[i + 1].trim();
            if (
                currentLineText.endsWith('"') && 
                nextLineText.startsWith('"') && 
                !currentLineText.endsWith(',')
            ) {
                errorsCollection.push({
                    line: currentLineNum,
                    column: lines[i].length + 1,
                    type: "Syntax Error",
                    message: "Expected token ',' or missing structural delimiter after property value."
                });
            }
        }

        // Check 2: Invalid unquoted or trailing character structures anomalies
        if (currentLineText.endsWith(',') && (i === lines.length - 1 || lines[i+1].trim().startsWith(']')) || currentLineText.endsWith(', }') || currentLineText.endsWith(', ]')) {
            errorsCollection.push({
                line: currentLineNum,
                column: lines[i].lastIndexOf(',') + 1,
                type: "Trailing Comma Error",
                message: "Trailing comma is invalid in strict JSON specifications rules."
            });
        }

        // Check 3: Property key double quotes strict specs validation
        const keyMatch = currentLineText.match(/^([a-zA-Z0-9_]+)\s*:/);
        if (keyMatch) {
            errorsCollection.push({
                line: currentLineNum,
                column: lines[i].indexOf(keyMatch[1]) + 1,
                type: "Key Quotes Error",
                message: `Property key '${keyMatch[1]}' must be wrapped inside double quotes.`
            });
        }

        // Check 4: Single quote string syntax literal errors mapping
        if (currentLineText.includes("'")) {
            errorsCollection.push({
                line: currentLineNum,
                column: lines[i].indexOf("'") + 1,
                type: "Syntax Error",
                message: "Strings must use double quotes instead of single quotes literal configurations."
            });
        }
    }

    // STEP 3: Fallback Core check (Agar upar ke dynamic filters miss ho jayein, toh native parser layer call hogi)
    if (errorsCollection.length === 0) {
        try {
            JSON.parse(jsonString);
        } catch (err) {
            let line = 1;
            let column = 1;
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

            errorsCollection.push({
                line: line,
                column: column,
                type: "Syntax Error",
                message: errMsg
            });
        }
    }

    return errorsCollection;
}

// --- UPGRADED VALIDATE ROUTE ENDPOINT ---
router.post('/validate-json', (req, res) => {
    const { jsonString } = req.body;

    if (!jsonString || jsonString.trim() === '') {
        return res.json({ valid: true, errors: [] });
    }

    const detectedErrors = compileAllJsonErrors(jsonString);

    if (detectedErrors.length === 0) {
        return res.json({ valid: true, errors: [] });
    } else {
        // Frontend framework matrix arrays ko multiple errors loop processing data returns bhejega
        return res.json({
            valid: false,
            errors: detectedErrors
        });
    }
});