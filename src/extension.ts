// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Register the viewJson command for debug variables
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
				vscode.window.showErrorMessage('Failed to parse JSON: ' + error.message);
			}
		} catch (error) {
			vscode.window.showErrorMessage('Error processing variable: ' + error.message);
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
			enableScripts: true
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
		<title>JSON Viewer</title>
		<style>
			body {
				font-family: var(--vscode-font-family);
				color: var(--vscode-foreground);
				background-color: var(--vscode-editor-background);
				padding: 10px;
			}
			.json-container {
				font-family: var(--vscode-editor-font-family);
				font-size: 14px;
				background-color: var(--vscode-editor-background);
				padding: 10px;
				border-radius: 5px;
			}
			.collapsible {
				cursor: pointer;
			}
			.content {
				padding-left: 20px;
				display: none;
			}
			.visible {
				display: block;
			}
			.key {
				color: var(--vscode-symbolIcon-propertyForeground, #0451a5);
			}
			.string {
				color: var(--vscode-symbolIcon-stringForeground, #a31515);
			}
			.number {
				color: var(--vscode-symbolIcon-numberForeground, #098658);
			}
			.boolean {
				color: var(--vscode-symbolIcon-booleanForeground, #0000ff);
			}
			.null {
				color: var(--vscode-symbolIcon-nullForeground, #808080);
			}
		</style>
	</head>
	<body>
		<h1>JSON Viewer</h1>
		<div class="json-container" id="json-container"></div>
		<script>
			// The JSON data
			const jsonObj = ${jsonString};
			
			// Function to create the tree view
			function createTreeView(obj, container) {
				if (typeof obj !== 'object' || obj === null) {
					// Handle primitive values
					let valueClass = '';
					if (typeof obj === 'string') valueClass = 'string';
					else if (typeof obj === 'number') valueClass = 'number';
					else if (typeof obj === 'boolean') valueClass = 'boolean';
					else if (obj === null) valueClass = 'null';
					
					container.innerHTML = '<span class="' + valueClass + '">' + 
						(obj === null ? 'null' : JSON.stringify(obj)) + '</span>';
					return;
				}
				
				// Handle objects and arrays
				const isArray = Array.isArray(obj);
				const keys = Object.keys(obj);
				
				// Create the collapsible container
				const collapsible = document.createElement('div');
				collapsible.className = 'collapsible';
				collapsible.textContent = isArray ? '[' : '{';
				collapsible.addEventListener('click', function(e) {
					if (e.target === this) {
						const content = this.nextElementSibling;
						content.classList.toggle('visible');
					}
				});
				container.appendChild(collapsible);
				
				// Create the content container
				const content = document.createElement('div');
				content.className = 'content visible';
				container.appendChild(content);
				
				// Add each property/item
				keys.forEach((key, index) => {
					const item = document.createElement('div');
					
					// Create property name span for objects
					if (!isArray) {
						const keySpan = document.createElement('span');
						keySpan.className = 'key';
						keySpan.textContent = '"' + key + '": ';
						item.appendChild(keySpan);
					}
					
					// Create property value container
					const valueContainer = document.createElement('span');
					item.appendChild(valueContainer);
					
					// Recursively create tree for the value
					createTreeView(obj[key], valueContainer);
					
					// Add comma if not the last item
					if (index < keys.length - 1) {
						item.innerHTML += ',';
					}
					
					content.appendChild(item);
				});
				
				// Closing bracket
				const closingBracket = document.createElement('div');
				closingBracket.textContent = isArray ? ']' : '}';
				container.appendChild(closingBracket);
			}
			
			// Initialize the tree view
			const container = document.getElementById('json-container');
			createTreeView(jsonObj, container);
		</script>
	</body>
	</html>`;
}

// This method is called when your extension is deactivated
export function deactivate() { }
