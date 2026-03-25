# PowerShell Script for Automatic Git Synchronization
# Watches for file changes every 30 seconds and pushes them to GitHub.

Write-Host "Starting LIPIKA Git Sync..." -ForegroundColor Green
Write-Host "Watching for changes in: " (Get-Location)
Write-Host "Press Ctrl+C to stop."

$lastPushTime = Get-Date

while ($true) {
    # Check for changes using git status
    $status = git status --porcelain
    
    if ($status) {
        Write-Host "Changes detected! Preparing to sync..." -ForegroundColor Cyan
        
        # Debounce to prevent multiple quick pushes
        # Wait for 10 seconds of stability before pushing
        Start-Sleep -Seconds 10
        
        # Pull latest changes to avoid conflicts
        # Write-Host "Checking for remote updates..."
        # git pull --rebase origin main
        
        # Add, commit and push
        git add .
        $commitMessage = "auto: sync local changes - " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        git commit -m $commitMessage
        
        Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
        git push origin main
        
        Write-Host "Sync complete at " (Get-Date -Format "HH:mm:ss") -ForegroundColor Green
        $lastPushTime = Get-Date
    }
    
    # Wait for 20 seconds before next check
    Start-Sleep -Seconds 20
}
