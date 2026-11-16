using System;

namespace DropLink.Api.Models
{
    public class DocumentTopic
    {
        public int Id { get; set; }
        public int StudyNoteId { get; set; }
        public string TopicName { get; set; } = string.Empty;
        public string Keywords { get; set; } = string.Empty; // Comma-separated keywords
        public int PageNumber { get; set; } = 1;

        public StudyNote StudyNote { get; set; } = null!;
    }
}
