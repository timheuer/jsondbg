// Generated by Copilot
import * as vscode from 'vscode';

// Register the viewJson command for debug variables
export function registerViewJsonCommand(context: vscode.ExtensionContext): void {
    const viewJsonCommand = vscode.commands.registerCommand('jsondbg.viewJson', async (variable) => {
        // Get the active debug session
        const session = vscode.debug.activeDebugSession;
        if (!session) {
            vscode.window.showErrorMessage('No active debug session.');
            return;
        }

        try {
            let jsonValue = '';

            // Handle different ways the variable might be passed
            if (variable && variable.evaluateName) {
                // If we have an evaluate name, use it to get the value
                const response = await session.customRequest('evaluate', {
                    expression: variable.evaluateName,
                    context: 'hover'
                });
                jsonValue = response.result;
            } else if (variable && variable.value) {
                // Direct access to value (simpler case)
                jsonValue = variable.value;
            } else if (variable && variable.variable && variable.variable.value) {
                // Sometimes nested in a variable property
                jsonValue = variable.variable.value;
            } else {
                vscode.window.showErrorMessage('Cannot retrieve variable value.');
                return;
            }

            // If the value is enclosed in quotes (string representation), remove them
            if (jsonValue.startsWith('"') && jsonValue.endsWith('"')) {
                jsonValue = jsonValue.substring(1, jsonValue.length - 1);
                // Unescape any escaped quotes
                jsonValue = jsonValue.replace(/\\"/g, '"');
            }

            try {
                // Try to parse the JSON string
                const jsonObj = JSON.parse(jsonValue);
                // Create and show the JSON viewer
                createJsonViewer(jsonObj, context.extensionUri);
            } catch (error) {
                let errorMessage = 'Failed to parse JSON';
                if (error instanceof Error) {
                    errorMessage += ': ' + error.message;
                }
                vscode.window.showErrorMessage(errorMessage);
            }
        } catch (error) {
            let errorMessage = 'Error processing variable';
            if (error instanceof Error) {
                errorMessage += ': ' + error.message;
            }
            vscode.window.showErrorMessage(errorMessage);
        }
    });

    context.subscriptions.push(viewJsonCommand);
}

// Function to create a WebView panel to display JSON
function createJsonViewer(jsonObj: any, extensionUri: vscode.Uri): void {
    // Create and show panel
    const panel = vscode.window.createWebviewPanel(
        'jsonViewer',
        'JSON Viewer',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            localResourceRoots: [extensionUri],
            retainContextWhenHidden: true
        }
    );

    // Set the HTML content
    panel.webview.html = getWebviewContent(jsonObj);
}

// Generate the HTML content for the webview
function getWebviewContent(jsonObj: any): string {
    // Stringify the JSON with pretty formatting
    const jsonString = JSON.stringify(jsonObj, null, 2);

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
        <title>JSON Viewer</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                padding: 10px;
                line-height: 1.5;
            }
            .toolbar {
                margin-bottom: 10px;
            }
            .toolbar button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 4px 12px;
                margin-right: 8px;
                border-radius: 2px;
                cursor: pointer;
                font-size: 12px;
            }
            .toolbar button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            .json-container {
                font-family: var(--vscode-editor-font-family, 'monospace');
                font-size: 14px;
                background-color: var(--vscode-editor-background);
                padding: 10px;
                border-radius: 5px;
                overflow: auto;
            }
            .toggle {
                display: inline-block;
                width: 12px;
                height: 12px;
                text-align: center;
                line-height: 12px;
                cursor: pointer;
                margin-right: 4px;
                font-weight: bold;
                background-color: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
                border-radius: 3px;
                user-select: none;
            }
            .toggle:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            .toggle.collapsed::before {
                content: "+";
            }
            .toggle.expanded::before {
                content: "-";
            }
            .hidden {
                display: none;
            }
            .indent {
                padding-left: 20px;
                border-left: 1px dotted var(--vscode-editorIndentGuide-background);
                margin-left: 4px;
            }
            .property {
                display: flex;
                flex-wrap: wrap;
                position: relative;
            }
            .property:hover {
                background-color: var(--vscode-list-hoverBackground);
            }
            .property-row {
                display: flex;
                flex-direction: row;
                align-items: flex-start;
                width: 100%;
            }
            .key {
                color: var(--vscode-symbolIcon-propertyForeground, #7F0055);
                font-weight: bold;
            }
            .string {
                color: var(--vscode-symbolIcon-stringForeground, #2A00FF);
            }
            .number {
                color: var(--vscode-symbolIcon-numberForeground, #09885A);
            }
            .boolean {
                color: var(--vscode-symbolIcon-booleanForeground, #0000FF);
            }
            .null {
                color: var (--vscode-symbolIcon-nullForeground, #808080);
                font-style: italic;
            }
            .bracket {
                color: var(--vscode-foreground);
                font-weight: bold;
            }
            .colon {
                margin: 0 4px;
            }
            .comma {
                margin-right: 4px;
            }
        </style>
    </head>
    <body>
        <h1>JSON Viewer</h1>
        <div class="toolbar">
            <button id="expand-all">Expand All</button>
            <button id="collapse-all">Collapse All</button>
        </div>
        <div class="json-container" id="json-container"></div>
        <script>
            // Fix for browser compatibility
            if (typeof acquireVsCodeApi !== 'undefined') {
                const vscode = acquireVsCodeApi();
            }
            
            // The JSON data
            const jsonObj = ${jsonString};
            
            // Function to create the tree view
            function createTreeView(obj, container, isRoot = true) {
                if (typeof obj !== 'object' || obj === null) {
                    // Handle primitive values
                    const valueEl = document.createElement('span');
                    
                    if (typeof obj === 'string') {
                        valueEl.className = 'string';
                        valueEl.textContent = '"' + obj.replace(/"/g, '\\"') + '"';
                    } else if (typeof obj === 'number') {
                        valueEl.className = 'number';
                        valueEl.textContent = obj;
                    } else if (typeof obj === 'boolean') {
                        valueEl.className = 'boolean';
                        valueEl.textContent = obj;
                    } else if (obj === null) {
                        valueEl.className = 'null';
                        valueEl.textContent = 'null';
                    }
                    
                    container.appendChild(valueEl);
                    return;
                }
                
                // Handle objects and arrays
                const isArray = Array.isArray(obj);
                const keys = Object.keys(obj);
                const isEmpty = keys.length === 0;
                
                // Create the property div that will hold everything
                const propertyDiv = document.createElement('div');
                propertyDiv.className = 'property';
                
                // Create the row that holds the toggle and brackets
                const rowDiv = document.createElement('div');
                rowDiv.className = 'property-row';
                
                // Only add toggle button if the object has properties
                if (!isEmpty) {
                    const toggle = document.createElement('span');
                    toggle.className = 'toggle expanded';
                    toggle.addEventListener('click', function() {
                        const content = this.parentNode.nextElementSibling;
                        if (content) {
                            content.classList.toggle('hidden');
                            this.classList.toggle('expanded');
                            this.classList.toggle('collapsed');
                        }
                    });
                    rowDiv.appendChild(toggle);
                }
                
                // Add opening bracket
                const openBracket = document.createElement('span');
                openBracket.className = 'bracket';
                openBracket.textContent = isArray ? '[' : '{';
                rowDiv.appendChild(openBracket);
                
                // If empty, add closing bracket in the same line
                if (isEmpty) {
                    const closeBracket = document.createElement('span');
                    closeBracket.className = 'bracket';
                    closeBracket.textContent = isArray ? ']' : '}';
                    rowDiv.appendChild(closeBracket);
                }
                
                propertyDiv.appendChild(rowDiv);
                
                // Create content container for child properties
                if (!isEmpty) {
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'indent';
                    
                    // Add all properties
                    keys.forEach((key, index) => {
                        const propertyItemDiv = document.createElement('div');
                        propertyItemDiv.className = 'property';
                        
                        const propertyRowDiv = document.createElement('div');
                        propertyRowDiv.className = 'property-row';
                        
                        // Only show keys for objects, not arrays
                        if (!isArray) {
                            const keySpan = document.createElement('span');
                            keySpan.className = 'key';
                            keySpan.textContent = '"' + key + '"';
                            propertyRowDiv.appendChild(keySpan);
                            
                            const colonSpan = document.createElement('span');
                            colonSpan.className = 'colon';
                            colonSpan.textContent = ':';
                            propertyRowDiv.appendChild(colonSpan);
                        }
                        
                        // Add the value
                        const valueContainer = document.createElement('span');
                        propertyRowDiv.appendChild(valueContainer);
                        
                        // Add the value recursively
                        createTreeView(obj[key], valueContainer, false);
                        
                        // Add comma if not the last item
                        if (index < keys.length - 1) {
                            const commaSpan = document.createElement('span');
                            commaSpan.className = 'comma';
                            commaSpan.textContent = ',';
                            propertyRowDiv.appendChild(commaSpan);
                        }
                        
                        propertyItemDiv.appendChild(propertyRowDiv);
                        contentDiv.appendChild(propertyItemDiv);
                    });
                    
                    // Add the close bracket
                    const closingDiv = document.createElement('div');
                    const closeBracket = document.createElement('span');
                    closeBracket.className = 'bracket';
                    closeBracket.textContent = isArray ? ']' : '}';
                    closingDiv.appendChild(closeBracket);
                    contentDiv.appendChild(closingDiv);
                    
                    propertyDiv.appendChild(contentDiv);
                }
                
                container.appendChild(propertyDiv);
            }
            
            // Initialize the tree view
            const container = document.getElementById('json-container');
            createTreeView(jsonObj, container);
            
            // Expand/collapse all functionality
            document.getElementById('expand-all').addEventListener('click', function() {
                const allToggles = document.querySelectorAll('.toggle');
                const allContents = document.querySelectorAll('.indent');
                
                allToggles.forEach(toggle => {
                    toggle.classList.remove('collapsed');
                    toggle.classList.add('expanded');
                });
                
                allContents.forEach(content => {
                    content.classList.remove('hidden');
                });
            });
            
            document.getElementById('collapse-all').addEventListener('click', function() {
                const allToggles = document.querySelectorAll('.toggle');
                const allContents = document.querySelectorAll('.indent');
                
                allToggles.forEach(toggle => {
                    toggle.classList.remove('expanded');
                    toggle.classList.add('collapsed');
                });
                
                allContents.forEach(content => {
                    content.classList.add('hidden');
                });
            });
            
            // Add keyboard navigation
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    const activeElement = document.activeElement;
                    if (activeElement && activeElement.classList.contains('toggle')) {
                        activeElement.click();
                        e.preventDefault();
                    }
                }
            });
        </script>
    </body>
    </html>`;
}
