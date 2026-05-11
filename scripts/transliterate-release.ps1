# Rename only: files and folders with ae, oe, aa (ASCII) for GitHub-safe paths.
# Do NOT change text inside HTML/CSS/JS — undervisningstekst skal beholde ae, o, aa som danske bogstaver.
# After adding new media, update href/src/data-audio in HTML and "....mp3" strings in scripts to match new names,
# or run scripts/normalise-mp3-string-literals.ps1 to derive ASCII stems from Danish strings inside quotes.
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
while ($root -and -not (Test-Path (Join-Path $root "index.html"))) {
  $parent = Split-Path $root -Parent
  if ($parent -eq $root) { break }
  $root = $parent
}
if (-not (Test-Path (Join-Path $root "index.html"))) {
  throw "Could not find project root (index.html)."
}

function Convert-DanishToAscii([string]$s) {
  if ($null -eq $s -or $s.Length -eq 0) { return $s }
  return $s `
    -creplace [char]0x00E5, "aa" -creplace [char]0x00C5, "Aa" `
    -creplace [char]0x00E6, "ae" -creplace [char]0x00C6, "Ae" `
    -creplace [char]0x00F8, "oe" -creplace [char]0x00D8, "Oe"
}

$excludeDirs = @(".git", "node_modules", ".cursor", "scripts")

function Test-ExcludedPath($fullPath) {
  $norm = $fullPath.Replace("/", [IO.Path]::DirectorySeparatorChar)
  foreach ($d in $excludeDirs) {
    $needle = [IO.Path]::DirectorySeparatorChar + $d + [IO.Path]::DirectorySeparatorChar
    if ($norm -like "*$needle*") { return $true }
  }
  return $false
}

Write-Host "Root: $root (rename files and directories only)"

Get-ChildItem -LiteralPath $root -Recurse -File -Force | Where-Object { -not (Test-ExcludedPath $_.FullName) } |
  Sort-Object { -$_.FullName.Length } | ForEach-Object {
  $newBase = Convert-DanishToAscii $_.Name
  if ($newBase -cne $_.Name) {
    $dest = Join-Path $_.DirectoryName $newBase
    if (Test-Path -LiteralPath $dest) {
      Write-Warning "Skip rename (target exists): $($_.Name) -> $newBase"
    }
    else {
      Rename-Item -LiteralPath $_.FullName -NewName $newBase
      Write-Host "Renamed file: $newBase"
    }
  }
}

Get-ChildItem -LiteralPath $root -Recurse -Directory -Force | Where-Object { -not (Test-ExcludedPath $_.FullName) } |
  Sort-Object { -$_.FullName.Length } | ForEach-Object {
  $newBase = Convert-DanishToAscii $_.Name
  if ($newBase -cne $_.Name) {
    $parent = $_.Parent.FullName
    $dest = Join-Path $parent $newBase
    if (Test-Path -LiteralPath $dest) {
      Write-Warning "Skip dir rename (target exists): $($_.Name) -> $newBase"
    }
    else {
      Rename-Item -LiteralPath $_.FullName -NewName $newBase
      Write-Host "Renamed dir: $newBase"
    }
  }
}

Write-Host "Done."
