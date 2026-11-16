using System;

namespace DropLink.Api.Models
{
    public class UploadSession
    {
        public int Id { get; set; }
        public string SessionId { get; set; } = Guid.NewGuid().ToString("N");
        public int? UserId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public long TotalSize { get; set; }
        public long UploadedBytes { get; set; } = 0;
        public int TotalChunks { get; set; }
        public int UploadedChunks { get; set; } = 0;
        public int ChunkSize { get; set; } = 16 * 1024 * 1024; // 16 MB default
        public string TempDirectory { get; set; } = string.Empty;
        public string? Checksum { get; set; } // Expected SHA-256
        public string Status { get; set; } = "Active"; // Active, Completed, Failed, Cancelled
        public string TargetCategory { get; set; } = "General"; // General, Study, Document
        public int? TargetFolderId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
    }
}
