Add-Type -AssemblyName System.Drawing

$logoPath = "d:\CanYouHackIT\RescueLinkAI\public\main_logo.jpg"
$dest192 = "d:\CanYouHackIT\RescueLinkAI\public\icon-192.png"
$dest512 = "d:\CanYouHackIT\RescueLinkAI\public\icon-512.png"

if (Test-Path $logoPath) {
    $srcImg = [System.Drawing.Image]::FromFile($logoPath)

    # 1. Generate 512x512 icon with clean white padding
    $bmp512 = New-Object System.Drawing.Bitmap(512, 512)
    $g512 = [System.Drawing.Graphics]::FromImage($bmp512)
    $g512.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g512.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g512.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Fill white background
    $g512.Clear([System.Drawing.Color]::White)

    # Draw logo centered inside at 72% scale (368x368 with 72px padding)
    $pad512 = 72
    $size512 = 512 - ($pad512 * 2)
    $g512.DrawImage($srcImg, $pad512, $pad512, $size512, $size512)

    $bmp512.Save($dest512, [System.Drawing.Imaging.ImageFormat]::Png)
    $g512.Dispose()
    $bmp512.Dispose()

    # 2. Generate 192x192 icon with clean white padding
    $bmp192 = New-Object System.Drawing.Bitmap(192, 192)
    $g192 = [System.Drawing.Graphics]::FromImage($bmp192)
    $g192.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g192.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g192.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Fill white background
    $g192.Clear([System.Drawing.Color]::White)

    # Draw logo centered inside at 72% scale (138x138 with 27px padding)
    $pad192 = 27
    $size192 = 192 - ($pad192 * 2)
    $g192.DrawImage($srcImg, $pad192, $pad192, $size192, $size192)

    $bmp192.Save($dest192, [System.Drawing.Imaging.ImageFormat]::Png)
    $g192.Dispose()
    $bmp192.Dispose()

    $srcImg.Dispose()
    Write-Host "SUCCESS: Created padded PNG icons (icon-192.png & icon-512.png) with white margin!"
} else {
    Write-Host "ERROR: Source logo not found."
}
