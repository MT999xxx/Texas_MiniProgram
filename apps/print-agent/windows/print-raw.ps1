param(
  [Parameter(Mandatory = $true)]
  [string]$PrinterName,

  [Parameter(Mandatory = $true)]
  [string]$TextFile
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$text = [System.IO.File]::ReadAllText($TextFile, [System.Text.Encoding]::UTF8)
$lines = @($text -split "`r?`n")
while ($lines.Count -lt 3) {
  $lines += ''
}
$lines = @($lines | Select-Object -First 3)

$document = New-Object System.Drawing.Printing.PrintDocument
$document.PrinterSettings.PrinterName = $PrinterName
if (-not $document.PrinterSettings.IsValid) {
  throw "Printer not found or unavailable: $PrinterName"
}

# PaperSize uses hundredths of an inch: 40 mm = 157, 30 mm = 118.
$paper = New-Object System.Drawing.Printing.PaperSize('SetBar40x30', 157, 118)
$document.DefaultPageSettings.PaperSize = $paper
$document.DefaultPageSettings.Landscape = $false
$document.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
$document.OriginAtMargins = $false
$document.PrintController = New-Object System.Drawing.Printing.StandardPrintController

$document.add_PrintPage({
  param($sender, $eventArgs)

  $graphics = $eventArgs.Graphics
  $graphics.PageUnit = [System.Drawing.GraphicsUnit]::Display
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $brush = [System.Drawing.Brushes]::Black
  $fontFamily = 'Microsoft YaHei'
  $maxWidth = 147.0
  $left = 5.0
  $rowTops = @(7.0, 42.0, 77.0)
  $startSizes = @(10.0, 11.0, 11.0)

  $format = New-Object System.Drawing.StringFormat
  $format.FormatFlags = [System.Drawing.StringFormatFlags]::NoWrap
  $format.Trimming = [System.Drawing.StringTrimming]::EllipsisCharacter

  try {
    for ($index = 0; $index -lt 3; $index += 1) {
      $line = [string]$lines[$index]
      $fontSize = [double]$startSizes[$index]
      $font = $null

      while ($fontSize -ge 7.0) {
        if ($font) { $font.Dispose() }
        $font = New-Object System.Drawing.Font(
          $fontFamily,
          $fontSize,
          [System.Drawing.FontStyle]::Bold,
          [System.Drawing.GraphicsUnit]::Point
        )
        $measured = $graphics.MeasureString($line, $font)
        if ($measured.Width -le $maxWidth) { break }
        $fontSize -= 0.5
      }

      try {
        $rect = New-Object System.Drawing.RectangleF(
          $left,
          [double]$rowTops[$index],
          $maxWidth,
          30.0
        )
        $graphics.DrawString($line, $font, $brush, $rect, $format)
      } finally {
        if ($font) { $font.Dispose() }
      }
    }
  } finally {
    $format.Dispose()
  }

  $eventArgs.HasMorePages = $false
})

try {
  $document.Print()
} finally {
  $document.Dispose()
}
