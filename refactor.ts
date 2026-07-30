import { Project, SyntaxKind, VariableDeclarationKind } from 'ts-morph';
import * as fs from 'fs';

const project = new Project();
project.addSourceFilesAtPaths("src/app/coach/CoachClient.tsx");
const sourceFile = project.getSourceFileOrThrow("src/app/coach/CoachClient.tsx");

// 1. Add context export
const imports = sourceFile.getImportDeclarations();
const lastImport = imports[imports.length - 1];
sourceFile.insertVariableStatement(lastImport.getChildIndex() + 1, {
  declarationKind: VariableDeclarationKind.Const,
  isExported: true,
  declarations: [{
    name: 'CoachContext',
    initializer: 'React.createContext<any>(null)'
  }]
});

// 2. Find CoachDashboard function
const dashboard = sourceFile.getFunction("CoachDashboard");
if (!dashboard) throw new Error("CoachDashboard not found");

// 3. Find all functions inside CoachDashboard
const innerFunctions = dashboard.getFunctions();

// Variables we know are accessed globally by these panels
const globalVars = [
  'user', 'clubId', 'clubNombre', 'teamData', 'today', 'isPanama', 'session',
  'tab', 'setTab', 'selected', 'setSelected', 'sidebarOpen', 'setSidebarOpen',
  'openGroups', 'setOpenGroups', 'playerLogs', 'setPlayerLogs', 'playerWellness', 'setPlayerWellness',
  'loadingDetail', 'setLoadingDetail', 'showNew', 'setShowNew', 'showImport', 'setShowImport',
  'clubLogo', 'setClubLogo', 'logoSaving', 'setLogoSaving', 'teamName', 'setTeamName',
  'editingTeamName', 'setEditingTeamName', 'teamNameDraft', 'setTeamNameDraft',
  'playerSearch', 'setPlayerSearch', 'proxyMode', 'setProxyMode',
  'showGlobalDeleteModal', 'setShowGlobalDeleteModal', 'ciclo', 'setCiclo',
  'todayDehydrated', 'setTodayDehydrated', 'router', 'openPlayer',
  'filteredTeamData', 'available', 'unavailable', 'injured', 'responded', 'pending',
  'respondedRpe', 'pendingRpe', 'atRisk', 'caution', 'optimal', 'byPos',
  'secHead', 'PlayerBadge', 'PlayerScore', 'loadData', 'fetch'
]; 

for (const fn of innerFunctions) {
  const name = fn.getName();
  if (!name) continue;
  if (!name[0].match(/[A-Z]/)) continue; // Only React components
  
  console.log("Extracting", name);
  
  // Extract text
  let text = fn.getText();
  
  // Inject context logic
  text = text.replace(/\{\s*/, '{\n  const ctx = React.useContext(CoachContext);\n');
  const destructure = `  const { ${globalVars.join(', ')} } = ctx || {};\n`;
  text = text.replace(/(const ctx = React\.useContext\(CoachContext\);\n)/, `$1${destructure}`);

  // Insert before CoachDashboard
  sourceFile.insertText(dashboard.getStart(), text + '\n\n');
  
  // Remove from inside CoachDashboard
  fn.remove();
}

// 5. Wrap CoachDashboard return in Provider
const ctxObjectStr = `
  const ctx = {
    ${globalVars.join(',\n    ')}
  };
`;
const returnStatement = dashboard.getStatements().find(s => s.getKind() === SyntaxKind.ReturnStatement);
if (returnStatement) {
  returnStatement.replaceWithText(`${ctxObjectStr}\n  return (\n    <CoachContext.Provider value={ctx}>\n      ${returnStatement.getText().replace(/^return\s*/, '')}\n    </CoachContext.Provider>\n  );`);
}

sourceFile.saveSync();
console.log("Refactoring complete.");
