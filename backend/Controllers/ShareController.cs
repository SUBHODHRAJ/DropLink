using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Threading.Tasks;
using DropLink.Api.Data;
using DropLink.Api.DTOs;
using DropLink.Api.Hubs;
using DropLink.Api.Models;
using DropLink.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace DropLink.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ShareController : ControllerBase
    {
        private readonly DropLinkDbContext _db;
        private readonly IStorageService _storageService;
        private readonly ILanDiscoveryService _lanDiscovery;
        private readonly IHubContext<TransferHub> _hubContext;
        private readonly IConfiguration _config;

        public ShareController(
            DropLinkDbContext db,
            IStorageService storageService,
            ILanDiscoveryService lanDiscovery,
            IHubContext<TransferHub> hubContext,
            IConfiguration config)
        {
            _db = db;
            _storageService = storageService;
            _lanDiscovery = lanDiscovery;
            _hubContext = hubContext;
            _config = config;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(claim, out var id)) return id;
            return null;
        }

        // 1. LAN Status & QR Code
        [HttpGet("lan-status")]
        public async Task<IActionResult> GetLanStatus()
        {
            var port = Request.Host.Port ?? 5000;
            var status = _lanDiscovery.GetServerStatus(port);
            status.ConnectedDevicesCount = await _db.Devices.CountAsync(d => d.IsOnline);
            return Ok(status);
        }

        [HttpPost("refresh-pin")]
        public IActionResult RefreshPin()
        {
            var newPin = _lanDiscovery.RefreshPairingPin();
            return Ok(new { pin = newPin });
        }

        // 2. Pair Device
        [HttpPost("pair-device")]
        public async Task<IActionResult> PairDevice([FromBody] PairRequest request)
        {
            var isValidPin = _lanDiscovery.VerifyPairingPin(request.Pin);
            if (!isValidPin)
            {
                return BadRequest(new { message = "Invalid or expired pairing PIN. Check the dashboard QR/PIN." });
            }

            var userId = GetCurrentUserId();
            var device = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceIdentifier == request.DeviceIdentifier);
            if (device == null)
            {
                device = new Device
                {
                    UserId = userId,
                    DeviceIdentifier = request.DeviceIdentifier,
                    DeviceName = request.DeviceName,
                    DeviceType = request.DeviceType,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
                    IsPaired = true,
                    IsOnline = true,
                    LastConnectedAt = DateTime.UtcNow
                };
                _db.Devices.Add(device);
            }
            else
            {
                device.DeviceName = request.DeviceName;
                device.DeviceType = request.DeviceType;
                device.IsPaired = true;
                device.IsOnline = true;
                device.LastConnectedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();

            // Broadcast real-time SignalR event
            await _hubContext.Clients.All.SendAsync("DevicePaired", new
            {
                device.DeviceIdentifier,
                device.DeviceName,
                device.DeviceType,
                device.IsPaired
            });

            return Ok(new { success = true, deviceId = device.Id, message = "Device paired successfully!" });
        }

        [HttpGet("devices")]
        public async Task<IActionResult> GetDevices()
        {
            var devices = await _db.Devices
                .OrderByDescending(d => d.LastConnectedAt)
                .Select(d => new DeviceInfo
                {
                    Id = d.Id,
                    DeviceIdentifier = d.DeviceIdentifier,
                    DeviceName = d.DeviceName,
                    DeviceType = d.DeviceType,
                    IpAddress = d.IpAddress,
                    IsPaired = d.IsPaired,
                    IsOnline = d.IsOnline,
                    LastConnectedAt = d.LastConnectedAt
                })
                .ToListAsync();

            return Ok(devices);
        }

        // 3. Large File Transfer Engine: Initialize Upload Session (100GB+ Support)
        [HttpPost("upload-session")]
        public async Task<IActionResult> InitUploadSession([FromBody] InitUploadSessionRequest request)
        {
            if (request.TotalSize <= 0)
            {
                return BadRequest(new { message = "Total file size must be greater than zero." });
            }

            // Disk space validation before starting
            if (!_storageService.CheckAvailableDiskSpace(request.TotalSize))
            {
                return BadRequest(new { message = "Insufficient storage disk space for this transfer." });
            }

            var userId = GetCurrentUserId();
            var session = new UploadSession
            {
                SessionId = Guid.NewGuid().ToString("N"),
                UserId = userId,
                FileName = request.FileName,
                TotalSize = request.TotalSize,
                TotalChunks = request.TotalChunks,
                ChunkSize = request.ChunkSize,
                Checksum = request.Checksum,
                Status = "Active",
                TargetCategory = request.TargetCategory ?? "General",
                TargetFolderId = request.TargetFolderId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.UploadSessions.Add(session);
            await _db.SaveChangesAsync();

            return Ok(new UploadSessionResponse
            {
                SessionId = session.SessionId,
                TotalSize = session.TotalSize,
                TotalChunks = session.TotalChunks,
                ChunkSize = session.ChunkSize,
                UploadedBytes = 0,
                UploadedChunks = 0,
                Status = session.Status
            });
        }

        // 4. Large File Transfer Engine: Upload Chunk (Streamed to Disk)
        [HttpPost("upload-chunk/{sessionId}/{chunkIndex}")]
        [DisableRequestSizeLimit]
        public async Task<IActionResult> UploadChunk(string sessionId, int chunkIndex)
        {
            var session = await _db.UploadSessions.FirstOrDefaultAsync(s => s.SessionId == sessionId);
            if (session == null || session.Status != "Active")
            {
                return NotFound(new { message = "Upload session not found or inactive." });
            }

            if (Request.Body == null)
            {
                return BadRequest(new { message = "Empty chunk payload." });
            }

            // Stream chunk directly to disk - Never store in RAM
            await _storageService.SaveChunkAsync(sessionId, chunkIndex, Request.Body);

            session.UploadedChunks++;
            // Calculate approximate bytes uploaded
            var uploadedEstimate = Math.Min(session.TotalSize, (long)session.UploadedChunks * session.ChunkSize);
            session.UploadedBytes = uploadedEstimate;
            session.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            // Broadcast real-time progress through SignalR
            var percentage = Math.Round((double)session.UploadedBytes / session.TotalSize * 100, 1);
            await _hubContext.Clients.Group(sessionId).SendAsync("UploadProgress", new
            {
                SessionId = sessionId,
                ChunkIndex = chunkIndex,
                UploadedBytes = session.UploadedBytes,
                TotalBytes = session.TotalSize,
                Percentage = percentage
            });

            return Ok(new ChunkUploadResult
            {
                SessionId = sessionId,
                ChunkIndex = chunkIndex,
                UploadedBytes = session.UploadedBytes,
                TotalBytes = session.TotalSize,
                IsComplete = session.UploadedChunks >= session.TotalChunks
            });
        }

        // 5. Large File Transfer Engine: Assemble Final File
        [HttpPost("assemble/{sessionId}")]
        public async Task<IActionResult> AssembleSession(string sessionId)
        {
            var session = await _db.UploadSessions.FirstOrDefaultAsync(s => s.SessionId == sessionId);
            if (session == null)
            {
                return NotFound(new { message = "Upload session not found." });
            }

            try
            {
                // Assemble chunks into final file using high-speed streaming
                var relativePath = await _storageService.AssembleChunksAsync(
                    sessionId, 
                    session.FileName, 
                    session.TotalChunks, 
                    session.Checksum);

                var fullPath = Path.Combine(_storageService.GetStorageRoot(), relativePath);
                var fileInfo = new FileInfo(fullPath);

                var extension = Path.GetExtension(session.FileName).ToLowerInvariant();
                var mimeType = GetMimeType(extension);
                var category = DetermineCategory(extension, session.TargetCategory);

                // Compute checksum if not provided
                var checksum = session.Checksum;
                if (string.IsNullOrEmpty(checksum))
                {
                    checksum = await _storageService.CalculateChecksumAsync(fullPath);
                }

                var fileRecord = new FileItem
                {
                    UserId = session.UserId,
                    FileName = Path.GetFileName(fullPath),
                    OriginalFileName = session.FileName,
                    FileSize = fileInfo.Length,
                    FileExtension = extension,
                    MimeType = mimeType,
                    StorageProvider = "Local",
                    StoragePath = relativePath,
                    Checksum = checksum,
                    FileCategory = category,
                    FolderId = session.TargetFolderId,
                    UploadedAt = DateTime.UtcNow
                };

                _db.Files.Add(fileRecord);
                session.Status = "Completed";
                session.UploadedBytes = fileInfo.Length;

                // Log Transfer
                _db.Transfers.Add(new Transfer
                {
                    File = fileRecord,
                    FileName = session.FileName,
                    TotalBytes = fileInfo.Length,
                    TransferredBytes = fileInfo.Length,
                    SenderDevice = "Connected Client",
                    ReceiverDevice = "DropLink Host",
                    TransferType = "LAN",
                    TransferStatus = "Completed",
                    CompletedAt = DateTime.UtcNow
                });

                // If file is academic/PDF, create initial StudyNote entry
                if (extension == ".pdf" && (session.TargetCategory == "Study" || category == "Study" || category == "Document"))
                {
                    var studyNote = new StudyNote
                    {
                        UserId = session.UserId,
                        File = fileRecord,
                        DisplayName = Path.GetFileNameWithoutExtension(session.FileName),
                        ClassificationStatus = "Suggested",
                        UploadedAt = DateTime.UtcNow
                    };
                    _db.StudyNotes.Add(studyNote);
                }

                await _db.SaveChangesAsync();

                // SignalR completion broadcast
                await _hubContext.Clients.All.SendAsync("TransferCompleted", new
                {
                    FileId = fileRecord.Id,
                    FileName = fileRecord.OriginalFileName,
                    FileSize = fileRecord.FileSize,
                    Category = fileRecord.FileCategory
                });

                return Ok(new
                {
                    success = true,
                    fileId = fileRecord.Id,
                    fileName = fileRecord.OriginalFileName,
                    fileSize = fileRecord.FileSize,
                    downloadUrl = $"/api/share/download/{fileRecord.Id}"
                });
            }
            catch (Exception ex)
            {
                session.Status = "Failed";
                await _db.SaveChangesAsync();
                return StatusCode(500, new { message = "Assembly error: " + ex.Message });
            }
        }

        // 6. Direct Quick File Upload
        [HttpPost("upload-file")]
        [DisableRequestSizeLimit]
        public async Task<IActionResult> DirectUploadFile([FromForm] IFormFile file, [FromForm] string? category, [FromForm] int? folderId)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file received." });
            }

            var userId = GetCurrentUserId();
            var relativePath = await _storageService.SaveDirectFileAsync(file.FileName, file.OpenReadStream());
            var fullPath = Path.Combine(_storageService.GetStorageRoot(), relativePath);

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var checksum = await _storageService.CalculateChecksumAsync(fullPath);
            var cat = DetermineCategory(extension, category);

            var fileRecord = new FileItem
            {
                UserId = userId,
                FileName = Path.GetFileName(fullPath),
                OriginalFileName = file.FileName,
                FileSize = file.Length,
                FileExtension = extension,
                MimeType = file.ContentType ?? GetMimeType(extension),
                StorageProvider = "Local",
                StoragePath = relativePath,
                Checksum = checksum,
                FileCategory = cat,
                FolderId = folderId,
                UploadedAt = DateTime.UtcNow
            };

            _db.Files.Add(fileRecord);

            if (extension == ".pdf" && (category == "Study" || cat == "Study" || cat == "Document"))
            {
                var studyNote = new StudyNote
                {
                    UserId = userId,
                    File = fileRecord,
                    DisplayName = Path.GetFileNameWithoutExtension(file.FileName),
                    ClassificationStatus = "Suggested",
                    UploadedAt = DateTime.UtcNow
                };
                _db.StudyNotes.Add(studyNote);
            }

            await _db.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("TransferCompleted", new
            {
                FileId = fileRecord.Id,
                FileName = fileRecord.OriginalFileName,
                FileSize = fileRecord.FileSize
            });

            return Ok(new
            {
                success = true,
                fileId = fileRecord.Id,
                fileName = fileRecord.OriginalFileName,
                fileSize = fileRecord.FileSize,
                downloadUrl = $"/api/share/download/{fileRecord.Id}"
            });
        }

        // 7. Download File
        [HttpGet("download/{fileId}")]
        public async Task<IActionResult> DownloadFile(int fileId)
        {
            var file = await _db.Files.FindAsync(fileId);
            if (file == null || file.IsDeleted)
            {
                return NotFound(new { message = "File not found." });
            }

            var stream = _storageService.GetFileStream(file.StoragePath);
            if (stream == null)
            {
                return NotFound(new { message = "Physical file not found on disk." });
            }

            return File(stream, file.MimeType, file.OriginalFileName, enableRangeProcessing: true);
        }

        // 8. Stream File (Inline preview for PDF/Audio/Video/Images)
        [HttpGet("stream/{fileId}")]
        public async Task<IActionResult> StreamFile(int fileId)
        {
            var file = await _db.Files.FindAsync(fileId);
            if (file == null || file.IsDeleted)
            {
                return NotFound(new { message = "File not found." });
            }

            var stream = _storageService.GetFileStream(file.StoragePath);
            if (stream == null)
            {
                return NotFound(new { message = "Physical file not found on disk." });
            }

            return File(stream, file.MimeType, enableRangeProcessing: true);
        }

        // 9. Create Shared Link
        [HttpPost("links")]
        public async Task<IActionResult> CreateSharedLink([FromBody] CreateSharedLinkRequest request)
        {
            var file = await _db.Files.FindAsync(request.FileId);
            if (file == null || file.IsDeleted)
            {
                return NotFound(new { message = "File not found." });
            }

            var userId = GetCurrentUserId();
            var publicToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();

            string? passwordHash = null;
            if (!string.IsNullOrWhiteSpace(request.Password))
            {
                passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
            }

            DateTime? expiresAt = null;
            if (request.ExpiryDays.HasValue && request.ExpiryDays.Value > 0)
            {
                expiresAt = DateTime.UtcNow.AddDays(request.ExpiryDays.Value);
            }

            var link = new SharedLink
            {
                UserId = userId,
                FileId = request.FileId,
                PublicToken = publicToken,
                PasswordHash = passwordHash,
                ExpiresAt = expiresAt,
                DownloadLimit = request.DownloadLimit,
                DownloadCount = 0,
                IsActive = true,
                AllowPreview = request.AllowPreview,
                CreatedAt = DateTime.UtcNow
            };

            _db.SharedLinks.Add(link);
            await _db.SaveChangesAsync();

            var publicDomain = _config["StorageSettings:PublicDomain"] ?? "http://localhost:5000";
            var publicUrl = $"{publicDomain}/#/share/{publicToken}";

            return Ok(new SharedLinkDto
            {
                Id = link.Id,
                FileId = file.Id,
                FileName = file.OriginalFileName,
                FileSize = file.FileSize,
                MimeType = file.MimeType,
                PublicToken = link.PublicToken,
                PublicUrl = publicUrl,
                HasPassword = !string.IsNullOrEmpty(link.PasswordHash),
                ExpiresAt = link.ExpiresAt,
                DownloadLimit = link.DownloadLimit,
                DownloadCount = link.DownloadCount,
                IsActive = link.IsActive,
                AllowPreview = link.AllowPreview,
                CreatedAt = link.CreatedAt
            });
        }

        // 10. List Shared Links
        [HttpGet("links")]
        public async Task<IActionResult> GetSharedLinks()
        {
            var userId = GetCurrentUserId();
            var publicDomain = _config["StorageSettings:PublicDomain"] ?? "http://localhost:5000";

            var links = await _db.SharedLinks
                .Include(l => l.File)
                .Where(l => userId == null || l.UserId == userId)
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => new SharedLinkDto
                {
                    Id = l.Id,
                    FileId = l.FileId,
                    FileName = l.File.OriginalFileName,
                    FileSize = l.File.FileSize,
                    MimeType = l.File.MimeType,
                    PublicToken = l.PublicToken,
                    PublicUrl = $"{publicDomain}/#/share/{l.PublicToken}",
                    HasPassword = !string.IsNullOrEmpty(l.PasswordHash),
                    ExpiresAt = l.ExpiresAt,
                    DownloadLimit = l.DownloadLimit,
                    DownloadCount = l.DownloadCount,
                    IsActive = l.IsActive,
                    AllowPreview = l.AllowPreview,
                    CreatedAt = l.CreatedAt
                })
                .ToListAsync();

            return Ok(links);
        }

        // 11. Revoke / Delete Link
        [HttpDelete("links/{id}")]
        public async Task<IActionResult> RevokeSharedLink(int id)
        {
            var link = await _db.SharedLinks.FindAsync(id);
            if (link == null) return NotFound(new { message = "Link not found." });

            _db.SharedLinks.Remove(link);
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Shared link revoked." });
        }

        // 12. Public File Metadata Check (for anyone opening /share/{publicToken})
        [HttpGet("public/{publicToken}")]
        public async Task<IActionResult> GetPublicFileInfo(string publicToken)
        {
            var link = await _db.SharedLinks
                .Include(l => l.File)
                .FirstOrDefaultAsync(l => l.PublicToken == publicToken);

            if (link == null || !link.IsActive)
            {
                return NotFound(new { message = "Shared link is invalid or has been revoked." });
            }

            var isExpired = link.ExpiresAt.HasValue && link.ExpiresAt.Value < DateTime.UtcNow;
            var isLimitReached = link.DownloadLimit.HasValue && link.DownloadCount >= link.DownloadLimit.Value;

            return Ok(new PublicFileAccessDto
            {
                FileName = link.File.OriginalFileName,
                FileSize = link.File.FileSize,
                MimeType = link.File.MimeType,
                RequiresPassword = !string.IsNullOrEmpty(link.PasswordHash),
                AllowPreview = link.AllowPreview,
                ExpiresAt = link.ExpiresAt,
                IsExpired = isExpired,
                IsLimitReached = isLimitReached
            });
        }

        // 13. Public Download
        [HttpPost("public/{publicToken}/download")]
        public async Task<IActionResult> DownloadPublicFile(string publicToken, [FromBody] DownloadPasswordRequest? req)
        {
            var link = await _db.SharedLinks
                .Include(l => l.File)
                .FirstOrDefaultAsync(l => l.PublicToken == publicToken);

            if (link == null || !link.IsActive)
            {
                return NotFound(new { message = "Shared link is invalid or has been revoked." });
            }

            if (link.ExpiresAt.HasValue && link.ExpiresAt.Value < DateTime.UtcNow)
            {
                return BadRequest(new { message = "This shared link has expired." });
            }

            if (link.DownloadLimit.HasValue && link.DownloadCount >= link.DownloadLimit.Value)
            {
                return BadRequest(new { message = "Download limit for this link has been reached." });
            }

            if (!string.IsNullOrEmpty(link.PasswordHash))
            {
                if (string.IsNullOrEmpty(req?.Password) || !BCrypt.Net.BCrypt.Verify(req.Password, link.PasswordHash))
                {
                    return Unauthorized(new { message = "Incorrect password for this shared link." });
                }
            }

            var stream = _storageService.GetFileStream(link.File.StoragePath);
            if (stream == null)
            {
                return NotFound(new { message = "File physical asset missing." });
            }

            link.DownloadCount++;
            await _db.SaveChangesAsync();

            return File(stream, link.File.MimeType, link.File.OriginalFileName, enableRangeProcessing: true);
        }

        private static string DetermineCategory(string extension, string? userCategory)
        {
            if (!string.IsNullOrEmpty(userCategory) && userCategory != "General") return userCategory;
            return extension switch
            {
                ".pdf" => "PDF",
                ".doc" or ".docx" or ".txt" or ".rtf" or ".odt" => "Document",
                ".jpg" or ".jpeg" or ".png" or ".gif" or ".webp" or ".svg" => "Image",
                ".mp4" or ".mkv" or ".avi" or ".mov" or ".webm" => "Video",
                ".mp3" or ".wav" or ".flac" or ".aac" => "Audio",
                ".zip" or ".rar" or ".7z" or ".tar" or ".gz" => "Archive",
                _ => "General"
            };
        }

        private static string GetMimeType(string extension)
        {
            return extension switch
            {
                ".pdf" => "application/pdf",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".doc" => "application/msword",
                ".txt" => "text/plain",
                ".png" => "image/png",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".gif" => "image/gif",
                ".webp" => "image/webp",
                ".mp4" => "video/mp4",
                ".mp3" => "audio/mpeg",
                ".zip" => "application/zip",
                _ => "application/octet-stream"
            };
        }
    }

    public class DownloadPasswordRequest
    {
        public string? Password { get; set; }
    }
}
