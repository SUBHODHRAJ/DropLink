using System;

namespace DropLink.Api.Models
{
    public class Note
    {
        public int Id { get; set; }
        public int? UserId { get; set; }
        public string Title { get; set; } = "Untitled Note";
        public string Content { get; set; } = string.Empty; // TipTap JSON / HTML content
        public string? PlainText { get; set; }
        public string? Color { get; set; } = "#38a9f6";
        public bool IsPinned { get; set; } = false;
        public bool IsFavorite { get; set; } = false;
        public bool IsDeleted { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
    }
}
