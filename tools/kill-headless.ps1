# Cierra solo los Chrome headless lanzados con un perfil temporal (nunca el Chrome normal del usuario).
param([string]$Profile = '\Temp\tmp.')
Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
  Where-Object { $_.CommandLine -like '*--headless*' -and $_.CommandLine -like "*$Profile*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
