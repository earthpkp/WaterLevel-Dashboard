# PowerShell script to convert CSV to SQL INSERT statements
$csv = Import-Csv -Path "waterlevel_data.csv"
$sqlFile = "import_waterlevel_data.sql"

"USE waterlevel_db;" | Out-File -FilePath $sqlFile -Encoding utf8
"" | Out-File -FilePath $sqlFile -Append -Encoding utf8
"-- Truncate existing data" | Out-File -FilePath $sqlFile -Append -Encoding utf8
"TRUNCATE TABLE waterlevel_data;" | Out-File -FilePath $sqlFile -Append -Encoding utf8
"" | Out-File -FilePath $sqlFile -Append -Encoding utf8
"-- Insert data from CSV" | Out-File -FilePath $sqlFile -Append -Encoding utf8

$count = 0
$batchSize = 100

Write-Host "Converting CSV to SQL..." -ForegroundColor Yellow
Write-Host "Total records: $($csv.Count)" -ForegroundColor Cyan

foreach ($row in $csv) {
    # Get date from H1 column (auto-generated name for unnamed column)
    $date = $row.H1
    
    # Skip if date is empty or invalid
    if ([string]::IsNullOrWhiteSpace($date)) {
        Write-Host "Skipping empty date row" -ForegroundColor Yellow
        continue
    }
    
    if ($count % $batchSize -eq 0) {
        if ($count -gt 0) {
            ";" | Out-File -FilePath $sqlFile -Append -Encoding utf8 -NoNewline
        }
        "" | Out-File -FilePath $sqlFile -Append -Encoding utf8
        "INSERT INTO waterlevel_data (date_time, x_274, x_119a, x_119) VALUES" | Out-File -FilePath $sqlFile -Append -Encoding utf8 -NoNewline
    } else {
        "," | Out-File -FilePath $sqlFile -Append -Encoding utf8 -NoNewline
    }
    
    $x274 = if ($row.'X.274' -and $row.'X.274' -ne '') { $row.'X.274' } else { 'NULL' }
    $x119a = if ($row.'X.119A' -and $row.'X.119A' -ne '') { $row.'X.119A' } else { 'NULL' }
    $x119 = if ($row.'X.119' -and $row.'X.119' -ne '') { $row.'X.119' } else { 'NULL' }
    
    "" | Out-File -FilePath $sqlFile -Append -Encoding utf8
    "  ('$date', $x274, $x119a, $x119)" | Out-File -FilePath $sqlFile -Append -Encoding utf8 -NoNewline
    
    $count++
    if ($count % 500 -eq 0) {
        Write-Host "  Processed $count records..." -ForegroundColor Gray
    }
}

";" | Out-File -FilePath $sqlFile -Append -Encoding utf8

Write-Host ""
Write-Host "✅ Successfully created $sqlFile" -ForegroundColor Green
Write-Host "Total records converted: $count" -ForegroundColor Cyan
Write-Host ""
Write-Host "To import into MySQL:" -ForegroundColor Yellow
Write-Host "  docker compose exec -T mysql mysql -u wateruser -pwaterpass waterlevel_db < $sqlFile" -ForegroundColor White
