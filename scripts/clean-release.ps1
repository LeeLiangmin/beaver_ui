$projectRoot = "F:\lee_space\code\playground\electron_learning"
$keep = "release3"   # the successful build to keep

Write-Host "Cleaning release directories (keeping: $keep)..."

$allDirs = Get-ChildItem $projectRoot -Directory | Where-Object { $_.Name -like 'release*' }

foreach ($dir in $allDirs) {
    if ($dir.Name -eq $keep) {
        Write-Host "  KEEP: $($dir.Name)"
        continue
    }
    try {
        Remove-Item -Recurse -Force $dir.FullName -ErrorAction Stop
        Write-Host "  DELETED: $($dir.Name)"
    } catch {
        Write-Host "  LOCKED: $($dir.Name) -- $($_.Exception.Message.Substring(0, [Math]::Min(60, $_.Exception.Message.Length)))"
    }
}

Write-Host "Done."
