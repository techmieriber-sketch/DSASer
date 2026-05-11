# Normalise *.mp3 string literals to ASCII filenames (aa/ae/oe) for GitHub; leaves other text alone.
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
while ($root -and -not (Test-Path (Join-Path $root "index.html"))) {
  $parent = Split-Path $root -Parent
  if ($parent -eq $root) { break }
  $root = $parent
}

function StemToAscii([string]$name) {
  if ($null -eq $name) { return $name }
  $name = $name.Replace([string][char]0x2013, "-")
  $name = $name -creplace [char]0x00E5, "aa"
  $name = $name -creplace [char]0x00C5, "Aa"
  $name = $name -creplace [char]0x00E6, "ae"
  $name = $name -creplace [char]0x00C6, "Ae"
  $name = $name -creplace [char]0x00F8, "oe"
  $name = $name -creplace [char]0x00D8, "Oe"
  return $name
}

function Normalize-Mp3Strings([string]$t) {
  $rx = [regex]::new('"([^"]+\.mp3)"')
  return $rx.Replace($t, {
      param($m)
      $inner = $m.Groups[1].Value
      $parts = $inner -split "/"
      for ($i = 0; $i -lt $parts.Length; $i++) {
        $parts[$i] = StemToAscii $parts[$i]
      }
      $newInner = $parts -join "/"
      return '"' + $newInner + '"'
    })
}

$excludeDirs = @(".git", "node_modules", ".cursor", "scripts")
function Test-ExcludedPath([string]$fullPath) {
  foreach ($d in $excludeDirs) {
    $needle = [IO.Path]::DirectorySeparatorChar + $d + [IO.Path]::DirectorySeparatorChar
    if ($fullPath.Contains($needle)) { return $true }
  }
  return $false
}

$utf8 = New-Object System.Text.UTF8Encoding $false
$ext = @(".html", ".htm", ".js")

Get-ChildItem -LiteralPath $root -Recurse -File -Force | Where-Object {
  ($ext -contains $_.Extension.ToLowerInvariant()) -and -not (Test-ExcludedPath $_.FullName)
} | ForEach-Object {
  $before = [IO.File]::ReadAllText($_.FullName, $utf8)
  $after = Normalize-Mp3Strings $before
  if ($after -cne $before) {
    [IO.File]::WriteAllText($_.FullName, $after, $utf8)
    Write-Host $_.FullName.Substring($root.Length + 1).TrimStart('\')
  }
}

Write-Host "Done ascii mp3 strings."
