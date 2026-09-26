param([int]$Port = 8899)
$root = Split-Path -Parent $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()
Write-Output "Listening on $Port, root=$root"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png"  = "image/png"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $reqPath = $context.Request.Url.AbsolutePath
  if ($reqPath -eq "/") { $reqPath = "/index.html" }
  $filePath = Join-Path $root ($reqPath.TrimStart("/") -replace "/", "\")
  if (Test-Path $filePath -PathType Leaf) {
    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
    $ct = $mime[$ext]
    if (-not $ct) { $ct = "application/octet-stream" }
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $context.Response.ContentType = $ct
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $context.Response.StatusCode = 404
    $msg = [System.Text.Encoding]::UTF8.GetBytes("Not found: $reqPath")
    $context.Response.OutputStream.Write($msg, 0, $msg.Length)
  }
  $context.Response.OutputStream.Close()
}
