Write-Host "================== DROPLINK AUTOMATED END-TO-END TEST SUITE ==================" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000"
$allPassed = $true

function Run-Step($name, $script) {
    Write-Host -NoNewline "[TEST] $name... "
    try {
        $result = & $script
        Write-Host "PASSED" -ForegroundColor Green
        return $result
    } catch {
        Write-Host "FAILED" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Yellow
        $script:allPassed = $false
        return $null
    }
}

# 1. Health Endpoint Test
Run-Step "API Health Check" {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get
    if ($res.status -ne "healthy") { throw "Status is not healthy" }
    $res
}

# 2. Frontend SPA HTML Serving Test
Run-Step "Frontend SPA HTML Serving" {
    $html = (Invoke-WebRequest -Uri "$baseUrl/" -Method Get -UseBasicParsing).Content
    if (-not ($html -match "DropLink")) { throw "HTML does not contain DropLink title" }
    "OK"
}

# 3. LAN Status & Pairing PIN Check
$lan = Run-Step "LAN Status & QR Code Generation" {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/share/lan-status" -Method Get
    if (-not $res.pairingPin) { throw "No pairing pin returned" }
    if (-not $res.qrCodeBase64.StartsWith("data:image/png;base64")) { throw "QR code was not properly generated" }
    $res
}

# 4. Device Pairing Test
Run-Step "Mobile Device PIN Pairing" {
    $body = @{
        deviceIdentifier = "test_phone_001"
        deviceName = "Google Pixel 9 Pro"
        deviceType = "Mobile"
        pin = $lan.pairingPin
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/share/pair-device" -Method Post -Body $body -ContentType "application/json"
    if (-not $res.success) { throw "Pairing was not successful" }
    $res
}

# 5. User Registration & JWT Auth Test
$testUser = "tester_" + (Get-Random -Minimum 1000 -Maximum 9999)
$auth = Run-Step "User Registration & JWT Issuance" {
    $body = @{
        username = $testUser
        email = "$testUser@droplink.test"
        password = "Password123!"
        fullName = "DropLink Test User"
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $body -ContentType "application/json"
    if (-not $res.token) { throw "No JWT token issued" }
    $res
}

# 6. Large File Engine: Chunked Upload and Assembly Test
$fileRes = Run-Step "Large File Engine: 16MB Chunk Streaming & Assembly" {
    $testFileName = "large_lecture_recording.dat"
    $chunkSize = 1024 * 1024 # 1MB test chunk
    $totalSize = 3 * $chunkSize
    $totalChunks = 3

    # Init session
    $initBody = @{
        fileName = $testFileName
        totalSize = $totalSize
        totalChunks = $totalChunks
        chunkSize = $chunkSize
        targetCategory = "Study"
    } | ConvertTo-Json
    $session = Invoke-RestMethod -Uri "$baseUrl/api/share/upload-session" -Method Post -Body $initBody -ContentType "application/json"
    $sessionId = $session.sessionId

    # Upload 3 binary chunks
    $chunkBytes = New-Object byte[] $chunkSize
    (New-Object Random).NextBytes($chunkBytes)

    for ($i = 0; $i -lt $totalChunks; $i++) {
        $uploadUrl = "$baseUrl/api/share/upload-chunk/$sessionId/$i"
        $chunkRes = Invoke-RestMethod -Uri $uploadUrl -Method Post -Body $chunkBytes -ContentType "application/octet-stream"
    }

    # Assemble session
    $assemble = Invoke-RestMethod -Uri "$baseUrl/api/share/assemble/$sessionId" -Method Post
    if (-not $assemble.success) { throw "File assembly failed" }
    $assemble
}

# 7. Document Creation & Server QuestPDF Export Test
Run-Step "Document Editing & QuestPDF Export Engine" {
    $docBody = @{
        title = "CS401 Operating Systems Unit 1 Notes"
        content = "<h1>Unit 1: Process Management & CPU Scheduling</h1><p>A process is an instance of a computer program that is being executed. Key concepts include Context Switching, PCB, and Round Robin scheduling.</p>"
        plainText = "Unit 1: Process Management & CPU Scheduling. A process is an instance of a computer program that is being executed."
        isFavorite = $true
    } | ConvertTo-Json
    $doc = Invoke-RestMethod -Uri "$baseUrl/api/edit/documents" -Method Post -Body $docBody -ContentType "application/json"

    # Export to PDF
    $pdfReq = @{
        title = $doc.title
        contentHtml = $doc.content
        contentJson = $doc.plainText
        saveToFiles = $true
    } | ConvertTo-Json
    $pdf = Invoke-RestMethod -Uri "$baseUrl/api/edit/export-pdf" -Method Post -Body $pdfReq -ContentType "application/json"
    if (-not $pdf.success) { throw "PDF generation failed" }
    $pdf
}

# 8. Study Library: Subject Creation & Academic Search Test
Run-Step "Study Library: Subject & Full-Text Search" {
    $subBody = @{
        subjectName = "Operating Systems"
        subjectCode = "CS401"
        semester = "Semester 4"
        description = "Core system concepts"
        color = "#38a9f6"
    } | ConvertTo-Json
    $sub = Invoke-RestMethod -Uri "$baseUrl/api/study/subjects" -Method Post -Body $subBody -ContentType "application/json"

    # Search for term
    $searchRes = Invoke-RestMethod -Uri "$baseUrl/api/study/search?q=Operating" -Method Get
    if ($searchRes.Count -eq 0) { throw "Search did not return matches" }
    $searchRes
}

# 9. Global Public Share Link Generation & Access Test
Run-Step "Global Internet Sharing: Public Token & Download" {
    $linkReq = @{
        fileId = $fileRes.fileId
        password = "SecureShare123"
        expiryDays = 7
        downloadLimit = 10
        allowPreview = $true
    } | ConvertTo-Json
    $link = Invoke-RestMethod -Uri "$baseUrl/api/share/links" -Method Post -Body $linkReq -ContentType "application/json"
    if (-not $link.publicToken) { throw "No public token created" }

    # Test Public Metadata retrieval
    $meta = Invoke-RestMethod -Uri "$baseUrl/api/share/public/$($link.publicToken)" -Method Get
    if (-not $meta.requiresPassword) { throw "Metadata did not reflect password protection" }

    # Test Download with correct password
    $downReq = @{ password = "SecureShare123" } | ConvertTo-Json
    $download = Invoke-WebRequest -Uri "$baseUrl/api/share/public/$($link.publicToken)/download" -Method Post -Body $downReq -ContentType "application/json" -UseBasicParsing
    if ($download.StatusCode -ne 200) { throw "Public download failed with status $($download.StatusCode)" }
    "OK"
}

Write-Host "==============================================================================="
if ($allPassed) {
    Write-Host "ALL 9 INTEGRATION TEST PHASES PASSED WITH ZERO ERRORS!" -ForegroundColor Green
} else {
    Write-Host "ONE OR MORE TESTS FAILED" -ForegroundColor Red
}
Write-Host "==============================================================================="
