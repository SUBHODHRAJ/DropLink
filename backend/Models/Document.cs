using System;

namespace DropLink.Api.Models
{
    public class Document
    {
        public int Id { get; set; }
        public int? UserId { get; set; }
        public string Title { get; set; } = "Untitled Document";
        public string Content { get; set; } = string.Empty; // TipTap JSON / HTML content
        public string? PlainText { get; set; }
        public int? FolderId { get; set; }
        public bool IsFavorite { get; set; } = false;
        public bool IsDeleted { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
        public Folder? Folder { get; set; }
    }
}
