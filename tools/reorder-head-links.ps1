# Reorder <link> tags after #critical-bg-cover: all stylesheets first, then preloads (original order kept within each group).
# Fixes layout "jump" when large image preload competes with render-blocking CSS on slow hosts (e.g. GitHub Pages).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "index.html"))) {
  $root = $PSScriptRoot
}

$nl = "`r`n"
$changed = 0
$skipped = 0

Get-ChildItem $root -Recurse -Include *.html, *.HTML -File | ForEach-Object {
  $path = $_.FullName
  $raw = [IO.File]::ReadAllText($path)

  if ($raw -notmatch "critical-bg-cover") {
    return
  }

  $preMatch = [regex]::Match($raw, '(?is)(?<pre>.*?<style id="critical-bg-cover">.*?</style>)')
  if (-not $preMatch.Success) {
    $skipped++
    return
  }

  $rest = $raw.Substring($preMatch.Length)
  $linkMatch = [regex]::Match($rest, '^(?is)(?:\s*<!--.*?-->\s*)*\s*(?<lb>(?:\s*<link\b[^>]+>\s*)+)')
  if (-not $linkMatch.Success) {
    return
  }

  $lb = $linkMatch.Groups["lb"].Value
  $linkEntries = [regex]::Matches($lb, '(?is)<link\b[^>]+>') | ForEach-Object { $_.Value.Trim() }
  if ($linkEntries.Count -eq 0) {
    return
  }

  $styleLinks = New-Object System.Collections.Generic.List[string]
  $otherLinks = New-Object System.Collections.Generic.List[string]
  foreach ($entry in $linkEntries) {
    if ($entry -match '\brel\s*=\s*["'']stylesheet["'']') {
      [void]$styleLinks.Add($entry)
    }
    else {
      [void]$otherLinks.Add($entry)
    }
  }

  if ($styleLinks.Count -eq 0) {
    return
  }

  $originalBlock = $linkMatch.Value
  $ordered = New-Object System.Collections.Generic.List[string]
  foreach ($s in $styleLinks) { [void]$ordered.Add("    $s") }
  foreach ($o in $otherLinks) { [void]$ordered.Add("    $o") }
  $newBlock = $nl + ($ordered -join $nl) + $nl

  if ($originalBlock -eq $newBlock) {
    return
  }

  $newRest = $newBlock + $rest.Substring($linkMatch.Length)
  $newRaw = $preMatch.Groups["pre"].Value + $newRest

  if ($raw -eq $newRaw) {
    return
  }

  $enc = New-Object System.Text.UTF8Encoding $false
  [IO.File]::WriteAllText($path, $newRaw.Replace("`n", $nl), $enc)
  $changed++
  Write-Host "Reorder links: $($path.Substring($root.Length).TrimStart('\','/'))"
}

Write-Host ""
Write-Host "Done. Files updated: $changed (skipped critical match: $skipped)."
