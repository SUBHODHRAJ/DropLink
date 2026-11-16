using System;
using System.Collections.Generic;

namespace DropLink.Api.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = "User"; // Admin, User
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ICollection<FileItem> Files { get; set; } = new List<FileItem>();
        public ICollection<Device> Devices { get; set; } = new List<Device>();
        public ICollection<Note> Notes { get; set; } = new List<Note>();
        public ICollection<Document> Documents { get; set; } = new List<Document>();
        public ICollection<Folder> Folders { get; set; } = new List<Folder>();
        public ICollection<Subject> Subjects { get; set; } = new List<Subject>();
        public ICollection<SharedLink> SharedLinks { get; set; } = new List<SharedLink>();
    }
}
