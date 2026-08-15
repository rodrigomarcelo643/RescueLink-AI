Add-Type -AssemblyName System.Drawing

$logoPath = "d:\CanYouHackIT\RescueLinkAI\public\main_logo.jpg"
$out192 = "d:\CanYouHackIT\RescueLinkAI\public\icon-192.png"
$out512 = "d:\CanYouHackIT\RescueLinkAI\public\icon-512.png"

if (Test-Path $logoPath) {
    $img = [System.Drawing.Image]::FromFile($logoPath)

    # Generate 192x192 PNG
    $bmp192 = New-Object System.Drawing.Bitmap 192, 192
    $g192 = [System.Drawing.Graphics]::FromImage($bmp192)
    $g192.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g192.DrawImage($img, 0, 0, 192, 192)
    $bmp192.Save($out192, [System.Drawing.Imaging.ImageFormat]::Png)
    $g192.Dispose()
    $bmp192.Dispose()

    # Generate 512x512 PNG
    $bmp512 = New-Object System.Drawing.Bitmap 512, 512
    $g512 = [System.Drawing.Graphics]::FromImage($bmp512)
    $g512.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g512.DrawImage($img, 0, 0, 512, 512)
    $bmp512.Save($out512, [System.Drawing.Imaging.ImageFormat]::Png)
    $g512.Dispose()
    $bmp512.Dispose()

    $img.Dispose()
    Write-Host "Successfully generated high-resolution PNG PWA icons from main_logo.jpg!"
} else {
    Write-Host "Logo file not found at $logoPath"
}
