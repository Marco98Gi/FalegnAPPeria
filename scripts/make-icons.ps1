param(
    [string]$LogoPath = (Join-Path $PSScriptRoot "logo-mark.png")
)

Add-Type -AssemblyName System.Drawing

function Get-MarkGeometry {
    param([System.Drawing.Bitmap]$Bmp, [int]$AlphaThreshold = 10)
    $w = $Bmp.Width; $h = $Bmp.Height
    $minX = $w; $minY = $h; $maxX = -1; $maxY = -1
    $sumX = 0.0; $sumY = 0.0; $sumA = 0.0
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $a = $Bmp.GetPixel($x, $y).A
            if ($a -gt $AlphaThreshold) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
                $sumX += $x * $a; $sumY += $y * $a; $sumA += $a
            }
        }
    }
    $bounds = [System.Drawing.Rectangle]::FromLTRB($minX, $minY, $maxX + 1, $maxY + 1)
    return @{ Bounds = $bounds; CentroidX = ($sumX / $sumA); CentroidY = ($sumY / $sumA) }
}

function New-AppIcon {
    param(
        [System.Drawing.Bitmap]$Source,
        $Geo,
        [int]$Size,
        [bool]$Maskable,
        [string]$OutPath
    )
    $b = $Geo.Bounds
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

    if ($Maskable) {
        $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)
        $padFrac = 0.16
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
        $padFrac = 0.05
    }

    $availW = $Size * (1 - 2 * $padFrac)
    $availH = $availW * ($b.Height / $b.Width)
    if ($availH -gt $Size * (1 - 2 * $padFrac)) {
        $availH = $Size * (1 - 2 * $padFrac)
        $availW = $availH * ($b.Width / $b.Height)
    }

    $relCX = ($Geo.CentroidX - $b.X) / $b.Width
    $relCY = ($Geo.CentroidY - $b.Y) / $b.Height
    $canvasCenter = $Size / 2.0
    $destX = $canvasCenter - ($relCX * $availW)
    $destY = $canvasCenter - ($relCY * $availH)

    $destRect = New-Object System.Drawing.RectangleF($destX, $destY, $availW, $availH)
    $g.DrawImage($Source, $destRect, $b, [System.Drawing.GraphicsUnit]::Pixel)

    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

if (-not (Test-Path $LogoPath)) {
    Write-Error "Logo non trovato: $LogoPath"
    exit 1
}

$source = [System.Drawing.Bitmap]::FromFile($LogoPath)
$geo = Get-MarkGeometry -Bmp $source
Write-Output "Bounding box marchio: $($geo.Bounds) - centroide: $($geo.CentroidX), $($geo.CentroidY)"

$iconDir = Join-Path $PSScriptRoot "..\icons"
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null

New-AppIcon -Source $source -Geo $geo -Size 512 -Maskable $false -OutPath (Join-Path $iconDir "icon-512.png")
New-AppIcon -Source $source -Geo $geo -Size 192 -Maskable $false -OutPath (Join-Path $iconDir "icon-192.png")
New-AppIcon -Source $source -Geo $geo -Size 512 -Maskable $true  -OutPath (Join-Path $iconDir "icon-512-maskable.png")
New-AppIcon -Source $source -Geo $geo -Size 192 -Maskable $true  -OutPath (Join-Path $iconDir "icon-192-maskable.png")
New-AppIcon -Source $source -Geo $geo -Size 180 -Maskable $false -OutPath (Join-Path $iconDir "apple-touch-icon.png")

$source.Dispose()
Write-Output "Icone rigenerate (simbolo GF grande, centrato sul baricentro) in $iconDir"

