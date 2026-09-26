param(
    [string]$LogoPath = (Join-Path $PSScriptRoot "logo-mark.png")
)

Add-Type -AssemblyName System.Drawing

function Get-OpaqueBounds {
    param([System.Drawing.Bitmap]$Bmp, [int]$AlphaThreshold = 10)
    $w = $Bmp.Width; $h = $Bmp.Height
    $minX = $w; $minY = $h; $maxX = -1; $maxY = -1
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            if ($Bmp.GetPixel($x, $y).A -gt $AlphaThreshold) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    return [System.Drawing.Rectangle]::FromLTRB($minX, $minY, $maxX + 1, $maxY + 1)
}

function New-AppIcon {
    param(
        [System.Drawing.Bitmap]$Source,
        [System.Drawing.Rectangle]$SourceBounds,
        [int]$Size,
        [bool]$Maskable,
        [string]$OutPath
    )
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

    if ($Maskable) {
        $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)
        $padFrac = 0.30
    } else {
        $radius = [int]($Size * 0.20)
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $d = $radius * 2
        $path.AddArc(0, 0, $d, $d, 180, 90)
        $path.AddArc($Size - $d, 0, $d, $d, 270, 90)
        $path.AddArc($Size - $d, $Size - $d, $d, $d, 0, 90)
        $path.AddArc(0, $Size - $d, $d, $d, 90, 90)
        $path.CloseFigure()
        $g.FillPath($bgBrush, $path)
        $padFrac = 0.22
    }

    $availW = $Size * (1 - 2 * $padFrac)
    $availH = $availW * ($SourceBounds.Height / $SourceBounds.Width)
    if ($availH -gt $Size * (1 - 2 * $padFrac)) {
        $availH = $Size * (1 - 2 * $padFrac)
        $availW = $availH * ($SourceBounds.Width / $SourceBounds.Height)
    }
    $destX = ($Size - $availW) / 2
    $destY = ($Size - $availH) / 2
    $destRect = New-Object System.Drawing.RectangleF($destX, $destY, $availW, $availH)

    $g.DrawImage($Source, $destRect, $SourceBounds, [System.Drawing.GraphicsUnit]::Pixel)

    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

if (-not (Test-Path $LogoPath)) {
    Write-Error "Logo non trovato: $LogoPath"
    exit 1
}

$source = [System.Drawing.Bitmap]::FromFile($LogoPath)
$bounds = Get-OpaqueBounds -Bmp $source
Write-Output "Bounding box marchio: $bounds (sorgente $($source.Width)x$($source.Height))"

$iconDir = Join-Path $PSScriptRoot "..\icons"
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null

New-AppIcon -Source $source -SourceBounds $bounds -Size 512 -Maskable $false -OutPath (Join-Path $iconDir "icon-512.png")
New-AppIcon -Source $source -SourceBounds $bounds -Size 192 -Maskable $false -OutPath (Join-Path $iconDir "icon-192.png")
New-AppIcon -Source $source -SourceBounds $bounds -Size 512 -Maskable $true  -OutPath (Join-Path $iconDir "icon-512-maskable.png")
New-AppIcon -Source $source -SourceBounds $bounds -Size 192 -Maskable $true  -OutPath (Join-Path $iconDir "icon-192-maskable.png")
New-AppIcon -Source $source -SourceBounds $bounds -Size 180 -Maskable $true  -OutPath (Join-Path $iconDir "apple-touch-icon.png")

$source.Dispose()
Write-Output "Icone rigenerate con il logo aziendale in $iconDir"
