using System;
using System.Collections.Generic;

namespace DropLink.Api.Models
{
    public class FileItem
    {
        public int Id { get; set; }
        public int? UserId { get; set; }
        public string FileName { get; set; } = string.Empty; // Stored unique name
        public string OriginalFileName { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public string FileExtension { get; set; } = string.Empty;
        public string MimeType { get; set; } = string.Empty;
        public string StorageProvider { get; set; } = "Local"; // Local, Cloud, S3
        public string StoragePath { get; set; } = string.Empty;
        public string Checksum { get; set; } = string.Empty; // SHA-256
        public string FileCategory { get; set; } = "General"; // Document, PDF, Image, Video, Audio, Archive, Code, Study
        public int? FolderId { get; set; }
        public bool IsFavorite { get; set; } = false;
        public bool IsDeleted { get; set; } = false;
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DeletedAt { get; set; }

        public User? User { get; set; }
        public Folder? Folder { get; set; }
        public ICollection<SharedLink> SharedLinks { get; set; } = new List<SharedLink>();
        public ICollection<StudyNote> StudyNotes { get; set; } = new List<StudyNote>();
    }
}
