Option Explicit

Dim shell, fso, scriptDir, agentRoot, nodePath, entryPath, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
agentRoot = fso.GetParentFolderName(scriptDir)
nodePath = shell.ExpandEnvironmentStrings("%ProgramFiles%") & "\nodejs\node.exe"

If Not fso.FileExists(nodePath) Then
  nodePath = "node.exe"
End If

entryPath = fso.BuildPath(agentRoot, "src\index.js")
command = """" & nodePath & """ """ & entryPath & """"

shell.Run command, 0, True
