using System;
using System.Collections.Generic;

namespace DropLink.Api.Models
{
    public class StudyNote
    {
        public int Id { get; set; }
        public int? UserId { get; set; }
        public int? FolderId { get; set; }
        public int? SubjectId { get; set; }
        public int FileId { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public string? ExtractedText { get; set; } // Full text extracted from PDF for search
        public string ClassificationStatus { get; set; } = "Organized"; // Organized, Suggested, NeedsReview
        public string? SuggestedSubject { get; set; }
        public string? SuggestedUnit { get; set; }
        public double ConfidenceScore { get; set; } = 1.0;
        public bool IsFavorite { get; set; } = false;
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastOpenedAt { get; set; }

        public User? User { get; set; }
        public StudyFolder? Folder { get; set; }
        public Subject? Subject { get; set; }
        public FileItem File { get; set; } = null!;
        public ICollection<Bookmark> Bookmarks { get; set; } = new List<Bookmark>();
        public ICollection<Annotation> Annotations { get; set; } = new List<Annotation>();
        public ICollection<DocumentTopic> Topics { get; set; } = new List<DocumentTopic>();
    }
}
