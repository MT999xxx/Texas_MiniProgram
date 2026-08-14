param(
  [string]$TaskName = 'Set baR Order Printer'
)

$ErrorActionPreference = 'Stop'
$agentRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $agentRoot '.env'
$runnerPath = Join-Path $PSScriptRoot 'run-agent.vbs'

if (-not (Test-Path $envPath)) {
  throw "Missing $envPath. Create it from .env.example first."
}

$action = New-ScheduledTaskAction `
  -Execute 'wscript.exe' `
  -Argument "//B //Nologo `"$runnerPath`"" `
  -WorkingDirectory $agentRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -RestartCount 10 `
  -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description 'Set baR paid order receipt printer' `
  -Force | Out-Null

Start-ScheduledTask -TaskName $TaskName
Write-Host "Print agent installed and started: $TaskName"
