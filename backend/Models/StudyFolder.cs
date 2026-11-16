using System;
using System.Collections.Generic;

namespace DropLink.Api.Models
{
    public class StudyFolder
    {
        public int Id { get; set; }
        public int? UserId { get; set; }
        public string FolderName { get; set; } = string.Empty;
        public int? ParentFolderId { get; set; }
        public int? SubjectId { get; set; }
        public string? UnitNumber { get; set; } // e.g. "Unit 1", "Unit 2"
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
        public Subject? Subject { get; set; }
        public StudyFolder? ParentFolder { get; set; }
        public ICollection<StudyFolder> SubFolders { get; set; } = new List<StudyFolder>();
        public ICollection<StudyNote> StudyNotes { get; set; } = new List<StudyNote>();
    }
}
