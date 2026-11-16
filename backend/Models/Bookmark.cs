using System;

namespace DropLink.Api.Models
{
    public class Bookmark
    {
        public int Id { get; set; }
        public int? UserId { get; set; }
        public int StudyNoteId { get; set; }
        public int PageNumber { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
        public StudyNote StudyNote { get; set; } = null!;
    }
}
