Write-Host "`n=== Investigating Node.js Processes ===" -ForegroundColor Cyan

$processIds = @(26628, 34132, 16208)

foreach ($processId in $processIds) {
    Write-Host "`n----------------------------------------" -ForegroundColor Gray
    Write-Host "PID: $processId" -ForegroundColor Yellow
    
    # Get process info
    $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if (-not $proc) {
        Write-Host "  Process not found (may have terminated)" -ForegroundColor Red
        continue
    }
    
    Write-Host "  Process Name: $($proc.ProcessName)" -ForegroundColor White
    Write-Host "  Start Time: $($proc.StartTime)" -ForegroundColor White
    
    # Get WMI info for command line
    $wmiProc = Get-WmiObject Win32_Process -Filter "ProcessId = $processId"
    if ($wmiProc.CommandLine) {
        Write-Host "  Command Line:" -ForegroundColor White
        Write-Host "    $($wmiProc.CommandLine)" -ForegroundColor Gray
    } else {
        Write-Host "  Command Line: (empty or access denied)" -ForegroundColor Gray
    }
    
    # Check parent process
    $parent = Get-Process -Id $proc.ParentId -ErrorAction SilentlyContinue
    if ($parent) {
        Write-Host "  Parent Process: $($parent.ProcessName) (PID: $($parent.Id))" -ForegroundColor White
    }
    
    # Check listening ports
    $connections = Get-NetTCPConnection -OwningProcess $processId -ErrorAction SilentlyContinue | 
                   Where-Object { $_.State -eq 'Listen' }
    
    if ($connections) {
        $ports = $connections | Select-Object -ExpandProperty LocalPort | Sort-Object -Unique
        Write-Host "  Listening Ports: $($ports -join ', ')" -ForegroundColor Green
        
        foreach ($port in $ports) {
            $service = switch ($port) {
                3001 { " -> User Service" }
                3002 { " -> Product Service" }
                3003 { " -> Order Service" }
                3004 { " -> Payment Service" }
                default { "" }
            }
            if ($service) {
                Write-Host "    Port $port$service" -ForegroundColor Cyan
            }
        }
    } else {
        Write-Host "  Listening Ports: None" -ForegroundColor Gray
    }
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
