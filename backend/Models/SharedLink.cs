using System;

namespace DropLink.Api.Models
{
    public class SharedLink
    {
        public int Id { get; set; }
        public int? UserId { get; set; }
        public int FileId { get; set; }
        public string PublicToken { get; set; } = string.Empty; // Unique token for /share/{token}
        public string? PasswordHash { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public int? DownloadLimit { get; set; }
        public int DownloadCount { get; set; } = 0;
        public bool IsActive { get; set; } = true;
        public bool AllowPreview { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
        public FileItem File { get; set; } = null!;
    }
}
