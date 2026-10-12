param(
    [string]$Directory = (Split-Path -Parent $PSScriptRoot)
)
$ErrorActionPreference = 'Stop'
$destination = Join-Path $Directory '.dev.vars'
if (Test-Path -LiteralPath $destination) {
    throw '.dev.vars sudah wujud. Edit secara private; skrip ini tidak menimpa secret sedia ada.'
}
$secret = Read-Host 'Masukkan GitHub fine-grained token (input disembunyikan)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
    $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    if ($value -notmatch '^github_pat_[A-Za-z0-9_]+$') { throw 'Gunakan fine-grained GitHub token.' }
    [IO.File]::WriteAllText($destination, "GITHUB_TOKEN=$value`n", [Text.UTF8Encoding]::new($false))
    Write-Output 'Secret local disimpan dalam .dev.vars (diabaikan Git). Nilai tidak dipaparkan.'
    Write-Output 'Ini belum menetapkan Cloudflare secret. Jangan upload .dev.vars ke GitHub.'
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $value = $null
}
