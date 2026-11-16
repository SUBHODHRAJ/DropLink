namespace DropLink.Api.DTOs
{
    public class DeviceInfo
    {
        public int Id { get; set; }
        public string DeviceIdentifier { get; set; } = string.Empty;
        public string DeviceName { get; set; } = string.Empty;
        public string DeviceType { get; set; } = "Mobile";
        public string IpAddress { get; set; } = string.Empty;
        public bool IsPaired { get; set; }
        public bool IsOnline { get; set; }
        public DateTime LastConnectedAt { get; set; }
    }

    public class PairRequest
    {
        public string DeviceIdentifier { get; set; } = string.Empty;
        public string DeviceName { get; set; } = string.Empty;
        public string DeviceType { get; set; } = "Mobile";
        public string Pin { get; set; } = string.Empty;
    }

    public class InitUploadSessionRequest
    {
        public string FileName { get; set; } = string.Empty;
        public long TotalSize { get; set; }
        public int TotalChunks { get; set; }
        public int ChunkSize { get; set; } = 16 * 1024 * 1024;
        public string? Checksum { get; set; }
        public string TargetCategory { get; set; } = "General";
        public int? TargetFolderId { get; set; }
        public string SenderDevice { get; set; } = "Unknown Device";
    }

    public class UploadSessionResponse
    {
        public string SessionId { get; set; } = string.Empty;
        public long TotalSize { get; set; }
        public int TotalChunks { get; set; }
        public int ChunkSize { get; set; }
        public long UploadedBytes { get; set; }
        public int UploadedChunks { get; set; }
        public string Status { get; set; } = "Active";
    }

    public class ChunkUploadResult
    {
        public string SessionId { get; set; } = string.Empty;
        public int ChunkIndex { get; set; }
        public long UploadedBytes { get; set; }
        public long TotalBytes { get; set; }
        public bool IsComplete { get; set; }
        public int? FileId { get; set; }
        public string? FileName { get; set; }
        public string? DownloadUrl { get; set; }
    }

    public class CreateSharedLinkRequest
    {
        public int FileId { get; set; }
        public string? Password { get; set; }
        public int? ExpiryDays { get; set; }
        public int? DownloadLimit { get; set; }
        public bool AllowPreview { get; set; } = true;
    }

    public class SharedLinkDto
    {
        public int Id { get; set; }
        public int FileId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public string MimeType { get; set; } = string.Empty;
        public string PublicToken { get; set; } = string.Empty;
        public string PublicUrl { get; set; } = string.Empty;
        public bool HasPassword { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public int? DownloadLimit { get; set; }
        public int DownloadCount { get; set; }
        public bool IsActive { get; set; }
        public bool AllowPreview { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class PublicFileAccessDto
    {
        public string FileName { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public string MimeType { get; set; } = string.Empty;
        public bool RequiresPassword { get; set; }
        public bool AllowPreview { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public bool IsExpired { get; set; }
        public bool IsLimitReached { get; set; }
    }

    public class LanServerStatusDto
    {
        public string LocalIp { get; set; } = string.Empty;
        public int Port { get; set; } = 5000;
        public string LanUrl { get; set; } = string.Empty;
        public string PairingPin { get; set; } = string.Empty;
        public string QrCodeBase64 { get; set; } = string.Empty;
        public int ConnectedDevicesCount { get; set; }
    }
}
