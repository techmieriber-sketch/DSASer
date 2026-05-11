# Restore Danish letters in visible/teaching text; keep href/src/data-audio/url() values unchanged.
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
while ($root -and -not (Test-Path (Join-Path $root "index.html"))) {
  $parent = Split-Path $root -Parent
  if ($parent -eq $root) { break }
  $root = $parent
}
if (-not (Test-Path (Join-Path $root "index.html"))) { throw "Project root not found." }

$excludeDirs = @(".git", "node_modules", ".cursor", "scripts")

function Test-ExcludedPath([string]$fullPath) {
  foreach ($d in $excludeDirs) {
    $needle = [IO.Path]::DirectorySeparatorChar + $d + [IO.Path]::DirectorySeparatorChar
    if ($fullPath.Contains($needle)) { return $true }
    if ($fullPath.EndsWith($([IO.Path]::DirectorySeparatorChar) + $d)) { return $true }
  }
  return $false
}

function Inverse-Danish([string]$s) {
  if ($null -eq $s -or $s.Length -eq 0) { return $s }
  $s = $s -creplace "ae", [char]0x00E6
  $s = $s -creplace "Ae", [char]0x00C6
  $s = $s -creplace "oe", [char]0x00F8
  $s = $s -creplace "Oe", [char]0x00D8
  $s = $s -creplace "aa", [char]0x00E5
  $s = $s -creplace "Aa", [char]0x00C5
  return $s
}

function Transform-Content([string]$t) {
  $protected = New-Object System.Collections.Generic.List[string]

  $rxAttr = [regex]::new(
    '(?i)\b(href|src|data-audio|poster|srcset)\s*=\s*"([^"]*)"',
    [System.Text.RegularExpressions.RegexOptions]::Compiled
  )
  $rxUrl = [regex]::new(
    '\burl\s*\(\s*("[^"]*"|''[^'']*''|[^)]+)\s*\)',
    [System.Text.RegularExpressions.RegexOptions]::Compiled
  )

  $mAttr = [System.Text.RegularExpressions.MatchEvaluator] {
    param($match)
    $ix = $protected.Count
    [void]$protected.Add($match.Groups[2].Value)
    $nm = $match.Groups[1].Value
    return ($nm + '="@@PRESERVE_' + $ix + '@@"')
  }
  $t = $rxAttr.Replace($t, $mAttr)

  $mUrl = [System.Text.RegularExpressions.MatchEvaluator] {
    param($match)
    $ix = $protected.Count
    [void]$protected.Add($match.Groups[1].Value)
    return 'url(@@PRESERVE_' + $ix + '@@)'
  }
  $t = $rxUrl.Replace($t, $mUrl)

  $t = Inverse-Danish $t

  for ($i = 0; $i -lt $protected.Count; $i++) {
    $tok = "@@PRESERVE_" + $i + "@@"
    $t = $t.Replace($tok, $protected[$i])
  }

  return $t
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$ext = @(".html", ".htm", ".css", ".js", ".mjs", ".cjs")

Get-ChildItem -LiteralPath $root -Recurse -File -Force | Where-Object {
  ($ext -contains $_.Extension.ToLowerInvariant()) -and -not (Test-ExcludedPath $_.FullName)
} | ForEach-Object {
  $path = $_.FullName
  $before = [IO.File]::ReadAllText($path, $utf8NoBom)
  $after = Transform-Content $before
  if ($after -cne $before) {
    [IO.File]::WriteAllText($path, $after, $utf8NoBom)
    Write-Host $path.Substring($root.Length + 1).TrimStart('\')
  }
}

Write-Host "Done."
