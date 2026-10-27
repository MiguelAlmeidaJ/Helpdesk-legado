[CmdletBinding(SupportsShouldProcess)]
param(
  [string]$MediaRoot = 'C:\HelpdeskMedia',
  [string]$ServiceAccount = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
)
$ErrorActionPreference = 'Stop'
$resolvedMediaRoot = [System.IO.Path]::GetFullPath($MediaRoot)
if ($resolvedMediaRoot -eq [System.IO.Path]::GetPathRoot($resolvedMediaRoot) -or $resolvedMediaRoot -match '(?i)([\\/](public|node_modules|windows|program files)([\\/]|$))') {
  throw 'Use a dedicated private directory outside published/system paths.'
}
$currentMediaPath = $resolvedMediaRoot
while ($currentMediaPath) {
  if ((Test-Path -LiteralPath $currentMediaPath) -and ((Get-Item -LiteralPath $currentMediaPath -Force).Attributes -band [System.IO.FileAttributes]::ReparsePoint)) { throw 'Storage path cannot contain a junction or symlink.' }
  $parentMediaDirectory = [System.IO.Directory]::GetParent($currentMediaPath)
  if (!$parentMediaDirectory) { break }
  $currentMediaPath = $parentMediaDirectory.FullName
}
if ($PSCmdlet.ShouldProcess($resolvedMediaRoot,'Create private media root and restrict ACL to administrators, SYSTEM and the API account')) {
  New-Item -ItemType Directory -Path $resolvedMediaRoot -Force | Out-Null
  & icacls $resolvedMediaRoot /inheritance:r /grant:r '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-18:(OI)(CI)F' ($ServiceAccount + ':(OI)(CI)M')
  if ($LASTEXITCODE -ne 0) { throw 'Failed to configure media ACL.' }
}
