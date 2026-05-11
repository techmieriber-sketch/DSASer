$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Get-PathFromRoot([string]$fullPath) {
  $rootNorm = [System.IO.Path]::GetFullPath($Root.TrimEnd("\", "/"))
  $fileNorm = [System.IO.Path]::GetFullPath($fullPath)

  if (-not $fileNorm.StartsWith($rootNorm, [StringComparison]::OrdinalIgnoreCase)) {
    return ($fullPath -replace "\\", "/")
  }

  $relative = $fileNorm.Substring($rootNorm.Length).TrimStart([char[]]"\\/")
  return ($relative -replace "\\", "/")
}

function Get-AssetsIconHref([string]$relFromRoot) {
  $norm = (($relFromRoot -replace "\\", "/").Trim())
  $idx = $norm.LastIndexOf("/")
  if ($idx -lt 0) {
    return "assets/site-icon.svg"
  }

  $dir = $norm.Substring(0, $idx).TrimEnd("/")
  if ([string]::IsNullOrWhiteSpace($dir)) {
    return "assets/site-icon.svg"
  }

  $levels = (($dir -split "/" | Where-Object { $_ -ne "" }) | Measure-Object).Count
  if ($levels -le 0) {
    return "assets/site-icon.svg"
  }

  return (("../" * $levels).TrimEnd("/") + "/assets/site-icon.svg")
}

$encoding = New-Object System.Text.UTF8Encoding $false
$changedFiles = 0

$relIconFirst = '(?im)^\s*<link\b[^>]*\brel\s*=\s*"icon"[^>]*>\s*$'
$hrefIconFirst = '(?im)^\s*<link\b[^>]*\bhref\s*=\s*"[^"]*site-icon\.svg"[^>]*>\s*$'

foreach ($f in Get-ChildItem $Root -Recurse -Include "*.html", "*.HTML" -File) {
  $t = [IO.File]::ReadAllText($f.FullName)
  if ($t -notmatch "site-icon\.svg") { continue }

  $rel = Get-PathFromRoot $f.FullName
  $href = Get-AssetsIconHref $rel
  $replacement = ('    <link rel="icon" href="{0}" type="image/svg+xml" />' -f $href)

  $t2 = [regex]::Replace($t, $relIconFirst, $replacement, 1)

  if ($t2 -eq $t) {
    $t2 = [regex]::Replace($t, $hrefIconFirst, $replacement, 1)
  }

  if ($t2 -eq $t) { continue }

  $normalized = [regex]::Replace($t2, "`r(?!\n)", "")
  $normalized = [regex]::Replace($normalized, "(?<!\r)\n", "`r`n")

  [IO.File]::WriteAllText($f.FullName, $normalized, $encoding)

  $changedFiles++
}

Write-Host "Updated favicon link in $changedFiles files."
