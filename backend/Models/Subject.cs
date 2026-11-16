using System;
using System.Collections.Generic;

namespace DropLink.Api.Models
{
    public class Subject
    {
        public int Id { get; set; }
        public int? UserId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty; // e.g. "CS401"
        public string Semester { get; set; } = string.Empty; // e.g. "Semester 4"
        public string Description { get; set; } = string.Empty;
        public string Color { get; set; } = "#38a9f6";
        public string Icon { get; set; } = "BookOpen";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
        public ICollection<StudyFolder> StudyFolders { get; set; } = new List<StudyFolder>();
    }
}
