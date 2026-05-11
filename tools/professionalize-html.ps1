param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$encoding = New-Object System.Text.UTF8Encoding $false

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

function Escape-HtmlAttr([string]$s) {
  if ([string]::IsNullOrWhiteSpace($s)) { return $s }
  return ($s -replace "&", "&amp;" -replace '"', "&quot;")
}

function Get-ThemeColor([string]$relFromRoot) {
  if ($relFromRoot -ieq "index.html") { return "#394652" }
  if ($relFromRoot -match '(?i)^udtale[\\/]') { return "#394652" }
  return "#1a3a4a"
}

function Ensure-LayoutShell([string]$content) {
  $rx = [regex]'<link\s+[^>]*href="([^"]*arbejdsteknik\.css)"[^>]*>'
  $stk = $rx.Matches($content).Count
  if ($stk -eq 0) { return @{ Text = $content; Changed = $false } }

  $sso = ([regex]::Matches($content, "layout-shell\.css")).Count

  # If shells already accompany every arbejdsteknik stylesheet line, assume we're done.
  if ($sso -ge $stk) { return @{ Text = $content; Changed = $false } }

  $sb = New-Object System.Text.StringBuilder
  $last = 0
  foreach ($m in $rx.Matches($content)) {
    [void]$sb.Append($content.Substring($last, $m.Index - $last))
    $href = $m.Groups[1].Value
    $shellHref = ($href -replace "arbejdsteknik\.css$", "layout-shell.css")

    $before = $content.Substring(0, $m.Index)
    $lines = [regex]::Split($before, "`r?`n")
    $prev = if ($lines.Count -ge 2) { $lines[$lines.Count - 2] } else { "" }

    if ($prev -notmatch "layout-shell\.css") {
      [void]$sb.Append(("    <link rel=`"stylesheet`" href=`"{0}`" />`r`n" -f $shellHref))
    }

    [void]$sb.Append($m.Value)
    $last = $m.Index + $m.Length
  }

  [void]$sb.Append($content.Substring($last))
  return @{ Text = $sb.ToString(); Changed = $true }
}

function Insert-HeadExtras([string]$content, [string]$relFromRoot, [bool]$loadsArbejdsteknik) {
  $changed = $false
  $t = $content

  # --- Meta / favicon / theme-color ---
  $hasDesc = ($t -match 'name\s*=\s*"description"')
  $hasIcon = ($t -match 'rel\s*=\s*"icon"')
  $hasTheme = ($t -match 'name\s*=\s*"theme-color"')

  if (-not $hasDesc -or -not $hasIcon -or -not $hasTheme) {
    $title = ""
    $tm = [regex]::Match($t, "(?is)<title>(?<t>.*?)</title>")
    if ($tm.Success) {
      $title = $tm.Groups["t"].Value.Trim()
      $title = ($title -replace '(?i)\s*[-–]\s*Dansk som andetsprog for serviceassistenter\.?\s*$', "").Trim()
    }

    $suffixPlain = " - Dansk som andetsprog for serviceassistenter."
    $descPlain = ""
    if (-not [string]::IsNullOrWhiteSpace($title)) {
      if ($title.Length -gt 120) { $title = $title.Substring(0, 117) + "..." }
      if ($title -ieq "Dansk som andetsprog for serviceassistenter") {
        $descPlain = "Digitalt undervisningsmateriale til serviceassistenter: Dansk som andetsprog med temaer, tekster og opgaver."
      }
      else {
        $descPlain = $title + $suffixPlain
      }
    }
    elseif ($loadsArbejdsteknik) {
      $descPlain = "Dansk som andetsprog for serviceassistenter."
    }

    $iconHref = Get-AssetsIconHref $relFromRoot
    $theme = Get-ThemeColor $relFromRoot

    $insertParts = New-Object System.Collections.Generic.List[string]
    if (-not $hasDesc -and -not [string]::IsNullOrWhiteSpace($descPlain)) {
      $escaped = Escape-HtmlAttr($descPlain)
      [void]$insertParts.Add(('    <meta name="description" content="{0}" />' -f $escaped))
    }

    if (-not $hasIcon) {
      [void]$insertParts.Add(('    <link rel="icon" href="{0}" type="image/svg+xml" />' -f $iconHref))
    }

    if (-not $hasTheme) {
      [void]$insertParts.Add(('    <meta name="theme-color" content="{0}" />' -f $theme))
    }

    if ($insertParts.Count -gt 0) {
      $block = "`r`n" + ($insertParts -join "`r`n")
      $viewportPattern = "(?is)(<meta\b[^>]*name\s*=\s*`"viewport`"[^>]*>)"
      $repl = [regex]::Replace(
        $t,
        $viewportPattern,
        { param($match) return $match.Groups[1].Value + $block },
        1)

      if ($repl -eq $t) {
        $charsetPattern = "(?is)(<meta\b[^>]*charset\s*=\s*[^>]*>)"
        $repl = [regex]::Replace(
          $t,
          $charsetPattern,
          { param($match) return $match.Groups[1].Value + $block },
          1)
      }

      if ($repl -ne $t) {
        $t = $repl
        $changed = $true
      }
    }
  }

  return @{ Text = $t; Changed = $changed }
}

$htmlFiles =
  @(Get-ChildItem $Root -Recurse -Include "*.html", "*.HTML" -File)

$counts = @{ FilesProcessed = 0; FilesChanged = 0; ShellAdded = 0; HeadExtras = 0 }

foreach ($file in $htmlFiles) {
  $counts.FilesProcessed++

  $rel = Get-PathFromRoot $file.FullName
  $raw = [IO.File]::ReadAllText($file.FullName)
  $t = $raw

  $loadsArbejdsteknik = ($t -match "arbejdsteknik\.css")

  # layout-shell BEFORE arbejdsteknik.css
  $r1 = Ensure-LayoutShell $t
  if ($r1.Changed) {
    $t = $r1.Text
    $counts.ShellAdded++
  }

  $r2 = Insert-HeadExtras $t $rel $loadsArbejdsteknik
  if ($r2.Changed) {
    $t = $r2.Text
    $counts.HeadExtras++
  }

  if ($t -ne $raw) {
    # Normaliser kun enkelte LF til CRLF — undgår dobbelt-CR ved allerede-Windows filer.
    $normalized = [regex]::Replace($t, "`r(?!\n)", "")
    $normalized = [regex]::Replace($normalized, "(?<!\r)\n", "`r`n")
    [IO.File]::WriteAllText($file.FullName, $normalized, $encoding)
    $counts.FilesChanged++
    Write-Host "Updated:" $rel
  }
}

Write-Host ""
Write-Host ("Processed HTML files: {0}" -f $counts.FilesProcessed)
Write-Host ("Files changed      : {0}" -f $counts.FilesChanged)
Write-Host ("Layout shell passes: {0}" -f $counts.ShellAdded)
Write-Host ("Head extras passes : {0}" -f $counts.HeadExtras)
