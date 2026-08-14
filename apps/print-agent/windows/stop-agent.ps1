$ErrorActionPreference = 'Stop'

$stopped = 0
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object {
    $_.CommandLine -and
    $_.CommandLine -match '(?i)print-agent' -and
    $_.CommandLine -match '(?i)src[\\/]index\.js'
  } |
  ForEach-Object {
    Invoke-CimMethod -InputObject $_ -MethodName Terminate | Out-Null
    $stopped += 1
  }

Write-Host "Stopped old print agent processes: $stopped"
