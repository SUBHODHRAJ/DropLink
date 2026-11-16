using System;
using System.Collections.Generic;

namespace DropLink.Api.Models
{
    public class Folder
    {
        public int Id { get; set; }
        public int? UserId { get; set; }
        public string FolderName { get; set; } = string.Empty;
        public int? ParentFolderId { get; set; }
        public string? Color { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
        public Folder? ParentFolder { get; set; }
        public ICollection<Folder> SubFolders { get; set; } = new List<Folder>();
        public ICollection<FileItem> Files { get; set; } = new List<FileItem>();
        public ICollection<Document> Documents { get; set; } = new List<Document>();
    }
}
